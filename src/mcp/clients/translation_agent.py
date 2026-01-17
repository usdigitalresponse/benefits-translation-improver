"""
Simple translation system using MultiServerMCPClient to work with several MCP servers.
"""

import asyncio
from langchain_mcp_adapters.client import MultiServerMCPClient
from langchain_anthropic import ChatAnthropic
from langgraph.prebuilt import create_react_agent
from dotenv import load_dotenv

load_dotenv()


async def main():
    mcp_client = MultiServerMCPClient(
        {
            "unemployment_insurance_context_documents": {
                "command": "python",
                "args": ["../servers/unemployment_insurance_context_documents.py"],
                "transport": "stdio",
            },
            "mt_server": {
                "command": "python",
                "args": ["../servers/machine_translation_server.py"],
                "transport": "stdio",
            },
            "llm_server": {
                "command": "python",
                "args": ["../servers/llm_translation_server.py"],
                "transport": "stdio",
            },
        }
    )

    tools = await mcp_client.get_tools()
    print(f"all available tools {tools}")

    llm = ChatAnthropic(model="claude-3-haiku-20240307")
    agent = create_react_agent(llm, tools)

    # Test MT only
    prompt1 = (
        "Use the machine translation server to translate 'Hello world' from en to es"
    )
    result1 = await agent.ainvoke({"messages": [{"role": "user", "content": prompt1}]})
    print(f"MT result: \n\n {result1}")

    # Test hybrid approach with supplemental docs
    prompt2 = """
    1. First use the machine translation server to get a translation of 'You are eligible for benefits' from en to es-MX
    2. Next, get any supplemental documents about unemployment insurance to improve the quality of the translation from 
    the unemployment insurance context documents server.
    3. Then use the LLM server to assess the quality of that translation
    4. If improvements are needed, use the LLM server to improve it
    5. Return the final result, as well as what tools you used.
    """
    result2 = await agent.ainvoke({"messages": [{"role": "user", "content": prompt2}]})
    print(f"Hybrid result: \n\n {result2}")


if __name__ == "__main__":
    asyncio.run(main())
