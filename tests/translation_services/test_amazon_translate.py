import pytest
from unittest.mock import MagicMock

from src.translation_services.amazon_translate import (
    translate,
    SupportedLanguagesCache,
    validate_supported_languages,
    UnsupportedLanguage
)


class MockTranslateClient:
    def __init__(self):
        self.translate_document = MagicMock()
        self.list_languages = MagicMock()
        self.exceptions = MagicMock()
        self.exceptions.ClientError = Exception


class TestTranslate:
    """
    Test various permutations of the translate method.
    """

    def setup_method(self):
        self.client = MockTranslateClient()
        self.source_text = "Hello world!"
        self.expected_result = "¡Hola, mundo!"
        self.mock_response = {
            "TranslatedDocument": {
                "Content": self.expected_result.encode("utf-8"),
            }
        }
        self.client.translate_document.return_value = self.mock_response

    def test_translate_basic(self):
        """
        No bells and whistles, request options should be formatted with default settings.
        """
        result = translate(
            client=self.client,
            source_text=self.source_text,
            source_language="en",
            target_language="es",
            formal=False
        )

        assert result == self.expected_result
        self.client.translate_document.assert_called_once()

        call_args = self.client.translate_document.call_args[1]
        assert call_args["Document"]["Content"] == self.source_text.encode("utf-8")
        assert call_args["Document"]["ContentType"] == "text/plain"
        assert call_args["SourceLanguageCode"] == "en"
        assert call_args["TargetLanguageCode"] == "es"
        assert call_args["Settings"]["Formality"] == "INFORMAL"
        assert "Profanity" not in call_args["Settings"]
        assert "Brevity" not in call_args["Settings"]

    def test_translate_with_formality(self):
        """
        Formality should be specified if requested.
        """
        result = translate(
            client=self.client,
            source_text=self.source_text,
            source_language="en",
            target_language="es",
            formal=True,
        )

        assert result == self.expected_result
        call_args = self.client.translate_document.call_args[1]
        assert call_args["Settings"]["Formality"] == "FORMAL"

    def test_translate_with_terminologies(self):
        """
        Terminologies should be included in request if provided.
        """
        terminologies = ["regulatory", "technical"]

        result = translate(
            client=self.client,
            source_text=self.source_text,
            source_language="en",
            target_language="es",
            terminologies=terminologies,
        )

        assert result == self.expected_result
        call_args = self.client.translate_document.call_args[1]
        assert call_args["TerminologyNames"] == terminologies

    def test_translate_with_profanity_masking(self):
        """
        Settings should indicate profanity masking if requested.
        """
        result = translate(
            client=self.client,
            source_text=self.source_text,
            source_language="en",
            target_language="es",
            mask_profanity=True,
        )

        assert result == self.expected_result
        call_args = self.client.translate_document.call_args[1]
        assert call_args["Settings"]["Profanity"] == "MASK"

    def test_translate_with_brevity(self):
        """
        Setting should indicate brevity if requested
        """
        result = translate(
            client=self.client,
            source_text=self.source_text,
            source_language="en",
            target_language="es",
            brevity=True,
        )

        assert result == self.expected_result
        call_args = self.client.translate_document.call_args[1]
        assert call_args["Settings"]["Brevity"] == "ON"

    def test_translate_client_error(self):
        """
        Error should be raised if client errors.
        """
        self.client.translate_document.side_effect = self.client.exceptions.ClientError

        with pytest.raises(Exception):
            translate(
                client=self.client,
                source_text=self.source_text,
                source_language="en",
                target_language="es",
            )


class TestSupportedLanguagesCache:
    """
    Test functionality of the SupportedLanguagesCache.
    """

    def setup_method(self):
        self.cache = SupportedLanguagesCache()
        self.mock_languages = [
            {"LanguageCode": "en", "LanguageName": "English"},
            {"LanguageCode": "es", "LanguageName": "Spanish"},
        ]

    def test_cache_initialization_empty(self):
        """
        By default, cache with no params should be empty
        """
        assert self.cache.size() == 0

    def test_cache_initialization_with_items(self):
        """
        Cache should add items on init if provided
        """
        cache = SupportedLanguagesCache(self.mock_languages)
        assert cache.size() == len(self.mock_languages)

    def test_add_items(self):
        """
        Cache should successfully add items when requested
        """
        self.cache.add_items(*self.mock_languages)

        assert self.cache.size() == len(self.mock_languages)

    def test_get_name_from_code(self):
        """
        Cache should get name from code and handle unknown codes gracefully
        """
        self.cache.add_items(*self.mock_languages)

        assert self.cache.get_name_from_code("en") == "English"
        assert self.cache.get_name_from_code("es") == "Spanish"
        assert self.cache.get_name_from_code("blah") is None

    def test_code_exists(self):
        """
        Cache should correctly identify if code exists, regardless of case
        """
        self.cache.add_items(*self.mock_languages)

        assert self.cache.code_exists("en") is True
        assert self.cache.code_exists("ES") is True  # should be case-insensitive
        assert self.cache.code_exists("fr") is False

    def test_normalize_code(self):
        """
        Cache should return code from initial data if it exists
        """
        self.cache.add_items(*self.mock_languages)

        assert self.cache.normalize_code("en") == "en"
        assert self.cache.normalize_code("ES") == "es"  # should return original case from input data
        assert self.cache.normalize_code("fr") is None

    def test_get_code_from_name(self):
        """
        Cache should return code given a name, regardless of case
        """
        self.cache.add_items(*self.mock_languages)

        assert self.cache.get_code_from_name("English") == "en"
        assert self.cache.get_code_from_name("spanish") == "es"
        assert self.cache.get_code_from_name("French") is None

    def test_name_exists(self):
        """
        Cache should indicate if name exists, regardless of case
        """
        self.cache.add_items(*self.mock_languages)

        assert self.cache.name_exists("English") is True
        assert self.cache.name_exists("SPANISH") is True
        assert self.cache.name_exists("French") is False

    def test_normalize_name(self):
        """
        Cache should return name as originally formatted
        """
        self.cache.add_items(*self.mock_languages)

        assert self.cache.normalize_name("english") == "English"
        assert self.cache.normalize_name("French") is None


@pytest.fixture
def mock_languages():
    return [
        {"LanguageCode": "en", "LanguageName": "English"},
        {"LanguageCode": "es", "LanguageName": "Spanish"},
        {"LanguageCode": "fr", "LanguageName": "French"},
    ]


@pytest.fixture
def mock_client(mock_languages):
    client = MockTranslateClient()
    client.list_languages.return_value = {
        "Languages": mock_languages,
        "NextToken": None,
    }
    return client


class TestValidateSupportedLanguages:
    def test_validate_with_empty_cache(self, mock_client, monkeypatch):
        """
        Empty cache should kick off a call to list languages
        """
        # Create and inject a completely fresh empty cache.
        # Need to use monkeypatch because otherwise parallel execution will wreak havoc
        fresh_cache = SupportedLanguagesCache()
        monkeypatch.setattr(
            "src.translation_services.amazon_translate._SUPPORTED_LANGUAGE_CACHE",
            fresh_cache
        )

        result = validate_supported_languages(mock_client, "en", "Spanish")

        assert result == ["en", "es"]
        assert mock_client.list_languages.called

    def test_validate_with_force_refresh(self, mock_client, mock_languages, monkeypatch):
        """
        If we force refresh we should call to list languages, even if we have a cache already
        """
        filled_cache = SupportedLanguagesCache()
        filled_cache.add_items(*mock_languages)
        monkeypatch.setattr(
            "src.translation_services.amazon_translate._SUPPORTED_LANGUAGE_CACHE",
            filled_cache
        )

        result = validate_supported_languages(
            mock_client,
            "en",
            force_cache_refresh=True
        )

        assert result[0] == "en"
        assert mock_client.list_languages.called

    def test_validate_with_filled_cache(self, mock_client, mock_languages, monkeypatch):
        """
        If we have a cache and don't force refresh, we should not call to list languages
        """
        filled_cache = SupportedLanguagesCache()
        filled_cache.add_items(*mock_languages)
        monkeypatch.setattr(
            "src.translation_services.amazon_translate._SUPPORTED_LANGUAGE_CACHE",
            filled_cache
        )

        result = validate_supported_languages(
            mock_client,
            "en",
            "Spanish"
        )

        assert result == ["en", "es"]
        assert not mock_client.list_languages.called

    def test_validate_with_pagination(self, mock_client, mock_languages, monkeypatch):
        """
        If response is paginated, we should call again until NextToken is None
        """
        fresh_cache = SupportedLanguagesCache()
        monkeypatch.setattr(
            "src.translation_services.amazon_translate._SUPPORTED_LANGUAGE_CACHE",
            fresh_cache
        )

        first_page = {
            "Languages": mock_languages[:2],
            "NextToken": "token123",
        }
        second_page = {
            "Languages": mock_languages[2:],
            "NextToken": None,
        }
        mock_client.list_languages.side_effect = [first_page, second_page]

        result = validate_supported_languages(
            mock_client,
            "en",
            "Spanish"
        )

        assert result == ["en", "es"]
        assert mock_client.list_languages.call_count == 2
        # Check pagination token was passed correctly
        second_call_args = mock_client.list_languages.call_args_list[1][1]
        assert "NextToken" in second_call_args
        assert second_call_args["NextToken"] == "token123"

    def test_validate_unsupported_languages(self, mock_client, mock_languages, monkeypatch):
        """
        We should raise an UnsupportedLanguage error if a language is not supported
        """
        filled_cache = SupportedLanguagesCache()
        filled_cache.add_items(*mock_languages)
        monkeypatch.setattr(
            "src.translation_services.amazon_translate._SUPPORTED_LANGUAGE_CACHE",
            filled_cache
        )

        with pytest.raises(UnsupportedLanguage) as exc_info:
            validate_supported_languages(mock_client, "en", "Unknown")

        assert "Unknown matches no supported language name or code" in str(exc_info.value)
