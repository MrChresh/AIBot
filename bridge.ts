import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import dotenv from "dotenv";
import {
  CallToolResultSchema,
} from "@modelcontextprotocol/sdk/types.js";
import http from 'node:http'

dotenv.config();

interface ContentBlockParam {
  content: string;
}
interface MessageParam {
  content: string | Array<ContentBlockParam>;

  role: 'user' | 'assistant' | 'system';
}
class MultiServerManager {
  private servers: Map<string, {
    client: Client,
    config: any,
    capabilities: {
      tools: any[],
      resources: any[],
      resourceTemplates: any,
      prompts: any[]
    }
  }> = new Map();

  async addServer(id: string, config: any): Promise<boolean> {
    try {
      // Create client
      const client = new Client(
        { name: 'MultiServerClient', version: '1.0.0' },
        { capabilities: {} }
      );

      // Create appropriate transport
      let transport;
      if (config.type === 'stdio') {
        transport = new StdioClientTransport({
          command: config.command,
          args: config.args || []
        });
      } else {
        throw new Error(`Unsupported transport type: ${config.type}`);
      }

      // Connect and initialize
      await client.connect(transport);

      // Discover capabilities
      const [tools] = await Promise.all([
        client.listTools(),
      ]);

      // Store server information
      this.servers.set(id, {
        client,
        config,
        capabilities: {
          tools: tools.tools,
          resources: [],
          resourceTemplates: [],
          prompts: []
        }
      });

      console.log(`Server ${id} added successfully`);
      return true;
    } catch (error) {
      console.error(`Error adding server ${id}:`, error);
      return false;
    }
  }

  getClient(id: string): Client | null {
    return this.servers.get(id)?.client || null;
  }

  getServerInfo(id: string): any {
    return this.servers.get(id);
  }

  getServers(): string[] {
    return Array.from(this.servers.keys());
  }

  async removeServer(id: string): Promise<boolean> {
    const server = this.servers.get(id);
    if (!server) return false;

    try {
      await server.client.close();
      this.servers.delete(id);
      console.log(`Server ${id} removed successfully`);
      return true;
    } catch (error) {
      console.error(`Error removing server ${id}:`, error);
      return false;
    }
  }

  // Get all tools across all servers
  getAllTools(): { serverId: string, tool: any }[] {
    const allTools: { serverId: string, tool: any }[] = [];

    for (const [id, server] of this.servers.entries()) {
      for (var tool of server.capabilities.tools) {
        allTools.push({ serverId: id, tool });
      }
    }

    return allTools;
  }
  getAllToolsAdapter(): { tool: any }[] {
    const allTools: any[] = [];

    for (const [id, server] of this.servers.entries()) {
      for (var tool of server.capabilities.tools) {
        var returnTool = {
          type: 'function',
          function: {
            name: tool.name,
            description: tool.description,
            parameters: tool.inputSchema
          }
        };
        allTools.push(returnTool);
      }
    }

    return allTools;
  }

  // Find a specific tool across all servers
  findTool(toolName: string): { serverId: string, tool: any } | null {
    for (const [id, server] of this.servers.entries()) {
      const tool = server.capabilities.tools.find(t => t.name === toolName);
      if (tool) return { serverId: id, tool };
    }
    return null;
  }

  // Execute a tool on the appropriate server
  async executeTool(toolName: string, args: any): Promise<any> {
    const toolInfo = this.findTool(toolName);
    if (!toolInfo) {
      throw new Error(`Tool ${toolName} not found on any server`);
    }

    const client = this.getClient(toolInfo.serverId);
    if (!client) {
      throw new Error(`Client for server ${toolInfo.serverId} not found`);
    }

    console.log(`Executing tool ${toolName} on server ${toolInfo.serverId}`);
    return await client.callTool(
      {
        name: toolName,
        arguments: args
      },
      CallToolResultSchema
    );
  }

  async close(): Promise<void> {
    const closePromises = Array.from(this.servers.entries()).map(async ([id, server]) => {
      try {
        await server.client.close();
        console.log(`Server ${id} closed successfully`);
      } catch (error) {
        console.error(`Error closing server ${id}:`, error);
      }
    });

    await Promise.all(closePromises);
    this.servers.clear();
  }
}
class MCPClient {
  public MCPServerManager: MultiServerManager = new MultiServerManager();
  public busy: Boolean = false;

  constructor() {

  }

  async processQuery(data: any, doInstructions: boolean, httpResponse: http.ServerResponse): Promise<string> {

    var messages: any[] = data.messages;





    // Get available tools
    const availableTools: any[] = this.MCPServerManager.getAllToolsAdapter();


    if (doInstructions) {
      const toolsMessage = '# Tools You may call one or more functions to assist with the user query. You are provided with function signatures within <tools></tools> XML tags: <tools>' + JSON.stringify(availableTools) + '</tools>For each function call, return a json object with function name and arguments within <tool_call></tool_call> XML tags:<tool_call>{"name": <name>, "arguments": <args-json-object>}</tool_call>'

      const systemPrompt = messages[0].content;

      messages.shift();
      messages.unshift({
        role: 'system',
        content: systemPrompt
      });
    }
    messages.forEach((message) => {

      if (!Array.isArray(message.content)) {
        message.content = [
          {
            type: 'text', text: message.content
          }
        ]
        if (message?.images) {
          message.images.forEach((image: any) => {
            message.content.push(
              {
                type: "image_url", image_url: {
                  url: image,
                }
              })
          })
        }
      }

    })

    var finalText: string[] = [];


    const postData = JSON.stringify({
      'model': data.model,
      'messages': messages,
      'stream': true,
      'tools': availableTools,
      'max_tokens': data.options.num_ctx,
      'options': {
        'temperature': 0.6,
        'top_p': 0.35,
        'num_ctx': data.options.num_ctx,
        'seed': 42
      }
    });
    //console.log(postData);

    const controller = new AbortController();
    const signal = controller.signal;

    const options = {
      hostname: '127.0.0.1',
      path: '/chat/completions',
      port: 8080,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
      },
      signal: signal
    };

    var resultObj: any;
    var result: any;
    var lastsQuerry = true;
    var stop = false;

    let toolName = '';
    let toolArgs = '';

    const req = http.request(options, (res) => {
      console.log(`STATUS: ${res.statusCode}`);
      //console.log(`HEADERS: ${JSON.stringify(res.headers)}`);
      res.setEncoding('utf8');
      res.on('data', async (chunk) => {
        //console.log(`BODY: ${chunk}`);
        const t = Buffer.from(chunk).toString('utf8').replace(/\r?\n/g, '');
        //process.stdout.write(chunk.replace(/\r?\n/g, ''));

        if (t.replace(/\r?\n/g, '').startsWith('data: ') && !stop) {
          //console.log('1:' + t.replace(/\r?\n/g, '').substring(32));
          const jsonString = t.replace(/\r?\n/g, '').substring(6);
          try {
            var message = JSON.parse(jsonString);

            //console.log(message.delta);
          } catch {

          }
        }

        if (message) {
          if (message.choices[0].delta?.reasoning_content) {
            httpResponse.write('{"message": {"thinking":' + JSON.stringify(message.choices[0].delta?.reasoning_content) + '}}')
          }
          else if (message.choices[0].delta?.content) {
            httpResponse.write('{"message": {"content":' + JSON.stringify(message.choices[0].delta?.content) + '}}')
          }
          //process.stdout.write(content);
          //httpResponse.write('{"message": {"content":' + JSON.stringify(content) + '}}')
          //finalText.push(message.delta.text);
          else if (message?.choices[0].delta?.tool_calls || message?.choices[0]?.finish_reason == 'tool_calls') {
            try {
              if (message?.choices[0]?.finish_reason != 'tool_calls') {
                if (message?.choices) {
                  if (message?.choices[0].delta?.tool_calls[0]?.function?.name) {
                    toolName = message.choices[0].delta.tool_calls[0].function.name;
                    toolArgs += message.choices[0].delta.tool_calls[0].function.arguments;
                    return;
                  }
                }
                //console.log(message.choices[0].delta.tool_calls[0].function)
                if (message?.choices[0]) {
                  if (message?.choices[0].delta?.tool_calls[0]?.function?.arguments) {
                    toolArgs += message.choices[0].delta.tool_calls[0].function.arguments;
                    return;
                  }
                }
              }
            } catch (e) {
              console.log(e);
            }
            try {

              lastsQuerry = false;
              console.log('Entered tool call')
              try {
                httpResponse.write(JSON.stringify('{"message": {"content": "' + toolName + JSON.stringify(toolArgs) + '"}}'))
                var toolCall = JSON.parse('{"name":"' + toolName + '","arguments":' + toolArgs + '}');
              } catch (e) {
                console.log(e)
                return;
              }

              finalText.push(
                `[Calling tool ${toolName} with args ${JSON.stringify(toolArgs)}]`
              );

              // Execute tool call
              try {
                if (this.MCPServerManager.findTool(toolName)) {
                  resultObj = await this.MCPServerManager.executeTool(
                    toolName,
                    JSON.parse(toolArgs)
                  );
                  //httpResponse.write(JSON.stringify(result));
                  result = JSON.stringify(resultObj);
                } else {
                  result = 'Invalid tool choice';

                }

              } catch (e: any) {
                result = String(e);
              }
              //httpResponse.write('{"message": {"content":' + JSON.stringify(result) + '}}');
              console.log(resultObj);




              // Add Claude's response (including tool use) to messages
              messages.push({
                role: "assistant",
                content: finalText.join(''),
              });

              // Add tool result to messages
              messages.push({
                role: "user",
                content: JSON.stringify(result.content) ?? result
              });

              finalText.push(JSON.stringify(result.content))

              var returnData: any = data;
              returnData.messages = messages;

              this.processQuery(data, false, httpResponse);

            } catch (e) {
              console.log(e)
            }
          }
        }
      });
      res.on('end', () => {
        console.log('No more data in response.');
        if (lastsQuerry) {
          httpResponse.end();
          this.busy = false;
        }
      });
    });

    req.on('abort', () => {
      console.log(`Request aborted.`);
      httpResponse.end();
      this.busy = false;
    });

    req.on('error', (e) => {
      console.error(`problem with request: ${e.message}`);
      httpResponse.end();
      this.busy = false;
    });



    // Write data to request body
    req.write(postData);
    req.end();

    return finalText.join('');
  }
}


// Main execution
async function main() {
  if (process.argv.length < 3) {
    console.log("Usage: ts-node client.ts <path_to_server_script>");
    process.exit(1);
  }
  const client = new MCPClient();

  try {
    for (var i = 2; i < process.argv.length; i++) {
      const isPython = process.argv[i].endsWith(".py");
      const isJs = process.argv[i].endsWith(".js");

      if (!isPython && !isJs) {
        throw new Error("Server script must be a .py, .js or .ts file");
      }
      var command = isPython ? "python" : "node";

      await client.MCPServerManager.addServer(String(i), { command: command, args: [process.argv[i]], type: 'stdio' });

    }

    //console.log(client.MCPServerManager.getAllTools());


    const server = http.createServer();

    server.on('request', (request, response) => {
      //console.log(request.url);
      if (request.url == '/api/chat') {
        let body = '';
        // Get the data as utf8 strings.
        // If an encoding is not set, Buffer objects will be received.
        request.setEncoding('utf8');

        // Readable streams emit 'data' events once a listener is added.
        request.on('data', (chunk) => {
          body += chunk;
        });

        // The 'end' event indicates that the entire body has been received.
        request.on('end', () => {
          try {
            const data = JSON.parse(body);
            // Write back something interesting to the user:
            //console.log(data);
            if (client.busy) {
              response.write('{"message": {"content":' + JSON.stringify('The AI is currently busy') + '}}')
              return response.end();
            }
            client.busy = false; //disabled
            if (data.messages) {
              response.setHeader("Transfer-Encoding", "chunked");
              client.processQuery(data, true, response);
              //response.end();
            }

          } catch (er: any) {
            // uh oh! bad json!
            client.busy = false;
            response.statusCode = 400;
            return response.end(`error: ${er.message}`);
          }
        });
      } else {
        console.log(request);
        response.write('nothing else here');
        response.end();
      }
    });
    server.listen(11054);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}


// Run main if this is the main module
/*if (import.meta.url === new URL(process.argv[1], "file:").href) {
  main();
}*/
main();
export default MCPClient;