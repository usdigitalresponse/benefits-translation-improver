from __future__ import annotations

import string
import typing

import pydantic

from src.lib.llm_tools import Tool
from src.lib.logging import get_logger

if typing.TYPE_CHECKING:  # pragma: nocover
    from mypy_boto3_bedrock_runtime import BedrockRuntimeClient
    from mypy_boto3_bedrock_runtime.type_defs import (
        ConverseRequestTypeDef,
        ConverseResponseTypeDef,
    )


class UnexpectedBedrockResponse(Exception):
    """Bedrock returned unexpected converse response data that could not be handled"""


PROMPT_TPL = string.Template(
    """
The following text has been translated to "$target_language_name" language.
The original document was in "$source_language_name".
Please identify common translation errors and suggest corrections.
Do not suggest translations for web URLs or proper nouns, such as the names of
government departments, systems, and services.
""".replace("\n", " ").strip()
)


def format_prompt(
    source_language, target_language, with_tool_name: typing.Optional[str] = ""
) -> str:
    prompt = PROMPT_TPL.substitute(
        target_language_name=target_language,
        source_language_name=source_language,
    )
    if with_tool_name:
        prompt = (
            f"{prompt} Use the {with_tool_name} tool "
            "to generate response JSON based on the translated document."
        )
    return prompt


@typing.overload
def suggest_translation_refinements(
    client: BedrockRuntimeClient,
    translated_text: str,
    source_language: str,
    target_language: str,
    with_tool: type[Tool],
) -> Tool: ...


@typing.overload
def suggest_translation_refinements(
    client: BedrockRuntimeClient,
    translated_text: str,
    source_language: str,
    target_language: str,
    with_tool: None,
) -> str: ...

def suggest_translation_refinements(
    client: BedrockRuntimeClient,
    translated_text: str,
    source_language: str,
    target_language: str,
    with_tool: typing.Optional[type[Tool]] = None,
) -> Tool | str:
    logger = get_logger(
        machine_readable_request=with_tool is not None,
        machine_readable_tool_type=with_tool,
        machine_readable_tool_name=with_tool.NAME if with_tool else None,
    )
    model_id = "anthropic.claude-3-5-haiku-20241022-v1:0"

    prompt = format_prompt(
        source_language=source_language,
        target_language=target_language,
        with_tool_name=with_tool.NAME if with_tool else None,
    )

    converse_kwargs: ConverseRequestTypeDef = {
        "modelId": model_id,
        "messages": [
            {
                "role": "user",
                "content": [{"text": translated_text}],
            },
        ],
        "system": [{"text": prompt}],
        "inferenceConfig": {"maxTokens": 5000, "temperature": 0.5, "topP": 0.9},
    }
    if with_tool is not None:
        logger.debug(
            "adding tool specification to request for machine-readable response"
        )
        converse_kwargs["toolConfig"] = {
            "tools": [with_tool.as_toolspec()],
            "toolChoice": {"tool": {"name": with_tool.NAME}},
        }

    logger.debug(
        "configured additional converse options",
        converse_kwargs=converse_kwargs,
        system_prompt=prompt,
        user_prompt=translated_text,
    )

    try:
        response: ConverseResponseTypeDef = client.converse(**converse_kwargs)
        logger.debug("received bedrock response", response=response)
    except client.exceptions.ClientError:
        logger.exception("error calling bedrock service")
        raise

    if with_tool:
        logger.debug("parsing bedrock response with tool")
        return _parse_conversation_response_with_tool(response, with_tool)

    return response["output"]["message"]["content"][0]["text"]


def _parse_conversation_response_with_tool(
    response: ConverseResponseTypeDef, tool_type: type[Tool]
) -> Tool:
    logger = get_logger(tool_type=tool_type)

    if response["stopReason"] != "tool_use":
        logger.error(
            'response stopReason must be "tool_use" in order to be parsed with tool',
            response_stop_reason=response["stopReason"],
        )
        raise UnexpectedBedrockResponse("invalid stopReason")

    all_message_content = response["output"]["message"]["content"]
    logger.debug(
        "received message content from bedrock",
        num_message_contents=len(all_message_content),
    )
    if len(all_message_content) == 0:
        raise UnexpectedBedrockResponse("no message content from bedrock")
    if len(all_message_content) > 1:
        raise UnexpectedBedrockResponse("too many message contents from bedrock")

    message_content = all_message_content[0]

    tool_use = message_content.get("toolUse")
    if not tool_use:
        logger.warn(
            "ignoring bedrock message content due to missing tool use",
            message_content=message_content,
        )
        raise Exception("unexpected message content without toolUse")

    logger = logger.bind(
        tool_use_name=tool_use["name"], tool_use_id=tool_use["toolUseId"]
    )
    try:
        data = tool_type.model_validate(tool_use["input"])
    except pydantic.ValidationError:
        logger.exception(
            "received malformed input for tool use in bedrock message content",
            actual_input=tool_use["input"],
            expected_schema=tool_type.model_json_schema(),
        )
        raise

    return data
