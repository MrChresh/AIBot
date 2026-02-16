var client = {};
client.AIBot = {};
client.AIBot.Messages = [];

var prompt = 'test';


                const content = "You are , a highly capable AI assistant. Your goal is to fully complete the users requested task before handing the conversation back to them. Keep working autonomously until the task is fully resolved. Be thorough in gathering information. Before replying, make sure you have all the details necessary to provide a complete solution. Use additional tools or ask clarifying questions when needed, but if you can find the answer on your own, avoid asking the user for help. When using tools, briefly describe your intended steps first—for example, which tool youll use and for what purpose. Adhere to this in all languages.respond in the same language as the users query.";
                const messageAuthor = 1234;
                if (!client.AIBot.Messages[messageAuthor]) {
                    client.AIBot.Messages[messageAuthor] = [
                        {
                            role: 'system',
                            content: content
                        },
                        {
                            role: 'user',
                            content: prompt
                        }
                    ];
                } else {
                    client.AIBot.Messages[messageAuthor][client.AIBot.Messages[messageAuthor].length] = {
                        role: 'user',
                        content: prompt
                    }
                }

                         client.AIBot.Messages[messageAuthor].forEach((message) => {
                            console.log(JSON.stringify(message))
                        })

                const assistantsCurrentMessageID = client.AIBot.Messages[messageAuthor].length;
                console.log(assistantsCurrentMessageID)

                                var messages = []
                client.AIBot.Messages[messageAuthor].forEach((message) => {
                    messages.push(message);
                });

const postData = JSON.stringify({
                    "model": process.env.OLLAMA_MODEL,
                    "messages": messages,
                    "think": true,
                    "stream": true,
                    "options": {
                        "temperature": 0.2,
                        "top_p": 0.35,
                        "num_ctx": 1234567,
                        "seed": 42
                    }
                });

                console.log(postData);