from __future__ import annotations

import datetime
import json
import os
import pathlib
import typing

import boto3
import typer

from src.lib.llm_tools import Tool
from src.tasks import translate
from src.translation_services.amazon_translate import validate_supported_languages

app = typer.Typer()


@app.command(name="translate")
def translate_cmd(
    source_dir: typing.Annotated[
        pathlib.Path,
        typer.Argument(
            help="Path to a directory containing a source.txt document.",
            file_okay=False,
            dir_okay=True,
            exists=True,
        ),
    ],
    source_language: typing.Annotated[
        str,
        typer.Argument(help="language code of the source.txt document"),
    ],
    target_language: typing.Annotated[
        str,
        typer.Argument(help="language code of the target translation"),
    ],
) -> None:
    translate_client = boto3.client("translate")
    source_language, target_language = validate_supported_languages(
        translate_client, source_language.strip(), target_language.strip()
    )
    print(f"Resolved source language code: {source_language}")
    print(f"Resolved target language code: {target_language}")

    print("Getting source text...")
    source_text_filename = os.path.join(source_dir, "source.txt")
    try:
        with open(source_text_filename) as fh:
            source_text = fh.read()
            source_document = translate.Document(
                content=source_text, language=source_language
            )
        print(f"Found existing source document file {source_text_filename}")
    except FileNotFoundError:
        print(f"ERROR: Could not read source text from file {source_text_filename}")
        exit(1)

    print("Getting initial target language translation...")
    target_language_dir = source_dir.joinpath(target_language)
    nmt_text_filename = target_language_dir.joinpath("translation.txt")
    try:
        with open(nmt_text_filename) as fh:
            nmt_text = fh.read()
            nmt_document = translate.Document(
                content=nmt_text,
                language=target_language,
                translation_source=source_document,
            )
        print(f"Found existing translation in file {nmt_text_filename}")
    except FileNotFoundError:
        print(f"No target language translation file {nmt_text_filename} currently exists")
        print("Translating source document contents with NMT...")
        nmt_document = source_document.translate(translate_client, target_language)
        print(f"Saving NMT result to {nmt_text_filename}")
        os.makedirs(target_language_dir, exist_ok=True)
        with open(nmt_text_filename, "w+") as fh:
            fh.write(nmt_document.content)

    print("Getting translation assessment...")
    assessment_dir = target_language_dir.joinpath(
        f"assessment-{datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H.%M.%SZ')}"
    )
    os.makedirs(assessment_dir)
    assessment = nmt_document.get_assessment(boto3.client("bedrock-runtime"))
    serialized_assessment = assessment.model_dump_json(indent=2)
    assessment_fname = os.path.join(assessment_dir, "assessment.json")
    with open(assessment_fname, "w+") as fh:
        print(f"Saving JSON assessment of the initial translation to {assessment_fname}")
        fh.write(serialized_assessment)

    print("Improving initial translation...")
    improved_translation_content = nmt_document.get_improved_content_from_assessment(
        assessment
    )
    improved_translation_fname = os.path.join(assessment_dir, "applied.txt")
    with open(improved_translation_fname, "w+") as fh:
        print(
            f"Saving improved version of the initial translation to {improved_translation_fname}"
        )
        fh.write(improved_translation_content)


def _show_schema_name_parser(value: str):
    allowed = {}
    for t in Tool.__subclasses__():
        allowed[t.__name__] = t
        allowed[t.NAME] = t
    try:
        return allowed[value]
    except KeyError:
        raise typer.BadParameter(f"must be one of: {', '.join(allowed.keys())}")


@app.command(name="show-tool-schema")
def show_tool_schema(
    tool: typing.Annotated[
        typing.Type[Tool],
        typer.Argument(
            help="Name of the LLM tool for which the JSON schema should be displayed.",
            parser=_show_schema_name_parser,
        ),
    ],
):
    tool = typing.cast(typing.Type[Tool], tool)
    print(json.dumps(tool.model_json_schema(), indent=2))


if __name__ == "__main__":
    app()
