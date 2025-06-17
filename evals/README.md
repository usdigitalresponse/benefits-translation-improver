To use the tools here, first download promptfoo
```
npm install -g promptfoo
```
OR 
```
brew install promptfoo
```

Then, verify that it's installed correctly:
```
promptfoo --version
```

To get started running tests, make sure you have API keys in your env file for the providers.
They should be labeled:
OPENAI_API_KEY
ANTHROPIC_API_KEY
GOOGLE_API_KEY

Then run:
```
npm run eval
```

Afterwards, you can view the results by running `npm run eval-view`
