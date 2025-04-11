from __future__ import annotations

import typing

from src.lib.logging import get_logger

if typing.TYPE_CHECKING:  # pragma: nocover
    from mypy_boto3_translate import TranslateClient
    from mypy_boto3_translate.type_defs import (
        TranslateDocumentRequestTypeDef,
        LanguageTypeDef,
        ListLanguagesRequestTypeDef,
    )


def translate_english_to_mexican_spanish(
    client: TranslateClient, source_text: str
) -> str:
    return translate(client, source_text, source_language="en", target_language="es-MX")


def translate(
    client: TranslateClient,
    source_text: str,
    source_language: str,
    target_language: str,
    terminologies: typing.Sequence[str] = (),
    formal: bool = True,
    mask_profanity: bool = False,
    brevity: bool = False,
) -> str:
    request_options: TranslateDocumentRequestTypeDef = {
        "Document": {
            "Content": source_text.encode("utf-8"),
            "ContentType": "text/plain",
        },
        "SourceLanguageCode": source_language,
        "TargetLanguageCode": target_language,
        "Settings": {"Formality": "FORMAL" if formal else "INFORMAL"},
    }
    if terminology_names := list(terminologies):
        request_options["TerminologyNames"] = terminology_names
    if mask_profanity:
        request_options["Settings"]["Profanity"] = "MASK"
    if brevity:
        request_options["Settings"]["Brevity"] = "ON"
    try:
        response = client.translate_document(**request_options)
        return response["TranslatedDocument"]["Content"].decode("utf-8")
    except client.exceptions.ClientError:
        raise


class SupportedLanguagesCache:
    def __init__(self, items: typing.Sequence[LanguageTypeDef] = ()):
        self._items_by_code: dict[str, LanguageTypeDef] = {}
        self._items_by_name: dict[str, LanguageTypeDef] = {}

    def size(self):
        return len(self._items_by_code)

    def add_items(self, *items: LanguageTypeDef):
        for item in items:
            self._items_by_code[item["LanguageCode"].lower()] = item
            self._items_by_name[item["LanguageName"].lower()] = item

    def get_name_from_code(self, code: str) -> str | None:
        return item["LanguageName"] if (item := self._items_by_code.get(code)) else None

    def code_exists(self, code: str) -> bool:
        return code.lower() in self._items_by_code.keys()

    def normalize_code(self, code: str) -> str | None:
        return item["LanguageCode"] if (item := self._items_by_code.get(code)) else None

    def get_code_from_name(self, name: str) -> str | None:
        return item["LanguageCode"] if (item := self._items_by_name.get(name.lower())) else None

    def name_exists(self, name: str) -> bool:
        return name.lower() in self._items_by_name.keys()

    def normalize_name(self, name: str) -> str | None:
        return item["LanguageName"] if (item := self._items_by_name.get(name)) else None


_SUPPORTED_LANGUAGE_CACHE = SupportedLanguagesCache()


class UnsupportedLanguage(Exception):
    pass


def validate_supported_languages(
    client: TranslateClient, *names_and_codes_to_validate: str, force_cache_refresh=False
) -> list[str]:
    logger = get_logger(service="amazon translate")
    if cache_size := _SUPPORTED_LANGUAGE_CACHE.size() == 0 or force_cache_refresh:
        logger.debug(
            "supported languages cache requires refresh",
            cache_size_before_refresh=cache_size,
            force_cache_refresh=force_cache_refresh,
        )
        request_options: ListLanguagesRequestTypeDef = {}
        while True:
            rs = client.list_languages(**request_options)
            _SUPPORTED_LANGUAGE_CACHE.add_items(*rs["Languages"])
            if not rs.get("NextToken"):
                break
            request_options["NextToken"] = rs["NextToken"]

    validated_codes: list[str] = []
    for v in names_and_codes_to_validate:
        if code := (_SUPPORTED_LANGUAGE_CACHE.normalize_code(v) or _SUPPORTED_LANGUAGE_CACHE.get_code_from_name(v)):
            validated_codes.append(code)
        else:
            raise UnsupportedLanguage(f"{v} matches no supported language name or code")

    return validated_codes
