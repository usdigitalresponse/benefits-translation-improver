from __future__ import annotations

import typing

from src.translation_services import amazon_translate
from src.translation_services import amazon_bedrock
from src.lib.llm_tools import TranslationAssessment


if typing.TYPE_CHECKING:  # pragma: nocover
    from mypy_boto3_bedrock_runtime import BedrockRuntimeClient
    from mypy_boto3_translate import TranslateClient


class MissingTranslationSource(Exception):
    """Invalid operation on a Document without a translation source"""
    pass

class MissingContent(Exception):
    """Document content is empty or blank"""


class Document:
    def __init__(
        self,
        content: str,
        language: str,
        translation_source: typing.Optional[Document] = None,
    ):
        self.content = content
        self.language = language
        self.translation_source = translation_source

    def translate(self, client: TranslateClient, language: str) -> Document:
        if not self.content.strip():
            raise MissingContent("cannot translate a document whose contents are missing or blank")
        return Document(
            content=amazon_translate.translate(
                client,
                source_text=self.content,
                source_language=self.language,
                target_language=language,
            ),
            language=language,
            translation_source=self,
        )

    def get_assessment(self, client: BedrockRuntimeClient) -> TranslationAssessment:
        if self.translation_source is None:
            raise MissingTranslationSource(
                "cannot assess a document that has no translation source"
            )
        if not self.content.strip():
            raise MissingContent("cannot assess a document whose contents are empty or blank")
        assessment = amazon_bedrock.suggest_translation_refinements(
            client,
            translated_text=self.content,
            source_language=self.translation_source.language,
            target_language=self.language,
            with_tool=TranslationAssessment,
        )
        assessment = typing.cast(TranslationAssessment, assessment)
        return assessment

    def get_improved_content_from_assessment(self, assessment) -> str:
        return apply_assessment_improvements(
            to_replace=self.content, assessment=assessment
        )


def apply_assessment_improvements(
    to_replace: str, assessment: TranslationAssessment
) -> str:
    result = to_replace
    for rep in assessment.improvements:
        result = result.replace(rep.excerpt, rep.replacement, -1)
    return result

