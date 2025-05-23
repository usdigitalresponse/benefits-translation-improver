from __future__ import annotations

import abc
import typing

import pydantic

if typing.TYPE_CHECKING:  # pragma: nocover
    import mypy_boto3_bedrock_runtime.type_defs


class Tool(pydantic.BaseModel, abc.ABC):
    NAME: typing.ClassVar[str] = NotImplemented
    DESCRIPTION: typing.ClassVar[str] = NotImplemented

    model_config = pydantic.ConfigDict(
        model_title_generator=lambda cls: cls.NAME,
    )

    @classmethod
    def as_toolspec(cls) -> mypy_boto3_bedrock_runtime.type_defs.ToolTypeDef:
        return {
            "toolSpec": {
                "name": cls.NAME,
                "description": cls.DESCRIPTION,
                "inputSchema": {"json": cls.model_json_schema()},
            }
        }


class TranslationImprovement(pydantic.BaseModel):
    excerpt: str = pydantic.Field(
        description="An excerpt from the original translation that is mistranslated or could otherwise be improved by replacing it with new text."
    )
    replacement: str = pydantic.Field(
        description="Text that should replace the excerpt as an improvement to the overall translation."
    )
    severity: typing.Literal["MAJOR", "MINOR"] = pydantic.Field(
        description="Grades whether the excerpt's translation issue is considered major or minor severity",
    )
    rationale: str = pydantic.Field(
        description="Describes the reason for the recommendation, or why the replacement text is a better translation compared to the excerpt text."
    )
    confidence: int = pydantic.Field(
        ge=1,
        le=10,
        description="A numeric score 1-10 that serves as a measure of confidence that this is a high-quality improvement",
    )


class TranslationAssessment(Tool):
    NAME = "translation_assessment"
    DESCRIPTION = "Provides feedback regarding and suggestions for improving a translated document."

    quality_assessments: list[str] = pydantic.Field(
        description="Observations regarding the quality of the overall translation",
        max_length=10,
        examples=[
            [
                "Overall, the translation is clear, accurate, and maintains the original document's tone and meaning",
                "Technical terminology is appropriately translated",
            ]
        ],
    )
    improvements: list[TranslationImprovement] = pydantic.Field(
        description="A list of objects that each provide a single recommendation for improving and/or correcting an excerpt of the translation.",
        examples=[
            [
                {
                    "excerpt": "cosas que le ayudarán a presentar su solicitud de UI",
                    "replacement": "cosas que le ayudarán a presentar su reclamo de UI",
                    "rationale": '"reclamo" is more appropriate than solicitude because the document is about unemployment claims',
                    "severity": "MINOR",
                },
                {
                    "excerpt": "Si está buscando adaptaciones razonables,",
                    "replacement": "Si está buscando adaptaciones especiales",
                    "rationale": '"adaptaciones razonables" could be more naturally phrased as "adaptaciones especiales"',
                    "severity": "MINOR",
                },
                {
                    "excerpt": "El registro del servicio de empleo es un requisito legal para las personas que han solicitado beneficios del seguro de desempleo.",
                    "replacement": "El registro del bolsa de trabajo es un requisito legal para las personas que han solicitado beneficios del seguro de desempleo.",
                    "rationale": '"bolsa de trabajo" is more suitable for Mexican Spanish',
                    "severity": "MINOR",
                },
                {
                    "excerpt": "pedazo de pastel",
                    "replacement": "pan comido",
                    "rationale": '"pedazo de pastel" is a mistranslation of the idiomatic expression "piece of cake", equivalent to "pan de comido" in Mexican Spanish',
                    "severity": "MAJOR",
                },
            ]
        ],
    )
