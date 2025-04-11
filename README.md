# translation_poc

Backend for language access translation services.

## Getting started

Prerequisites:

- Python 3.13
- [Poetry](https://python-poetry.org/)
- AWS credentials with access to the following services:
  - Translate
  - Bedrock Runtime (must have access to Anthropic Claude enabled)

Install dependencies by running `poetry install`.

To run the demo (CLI tool), first create a directory with a single file named `source.txt` that contains English text to translate.
This is the minimum requirement for running the tool.

### Example commands

> [!NOTE]
> Before running translations, your environment needs to be authenticated with AWS.

```cli
poetry run python -m src.cli translate ./samples/test1 en es-MX
```

This will perform the following actions:

1. Translate the English text in `samples/test1/source.txt` to Mexican Spanish using Amazon Translate
  and save the result to `samples/test1/es-MX/translation.txt`.

  **Note:** If a file already exists at `samples/test1/es-MX/translation.txt`, this step will be skipped.
2. Generate an assessment of the translation in `samples/test1/es-MX/translation.txt` using Claude (via Amazon Bedrock)
  and save the assessment JSON to `samples/test1/es-MX/assessment-DATETIME/assessment.json`
  (note: `DATETIME` will be substituted for the actual current datetime).
3. Apply the suggested translation improvements listed in `samples/test1/es-MX/assessment-DATETIME/assessment.json`
  to the NMT translation in `samples/test1/es-MX/assessment-DATETIME/translation.txt`
  and save the improved translation to `samples/test1/es-MX/assessment-DATETIME/applied.txt`.
