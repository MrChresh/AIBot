import http from 'node:http'

const postData = JSON.stringify({
                "model": "qwen3:30b",
                "messages": [
                    {
                        "role": "system",
                        "content": "You are Chresh AI, a highly capable AI assistant. Your goal is to fully complete the users requested task before handing the conversation back to them. Keep working autonomously until the task is fully resolved. Be thorough in gathering information. Before replying, make sure you have all the details necessary to provide a complete solution. Use additional tools or ask clarifying questions when needed, but if you can find the answer on your own, avoid asking the user for help. When using tools, briefly describe your intended steps first—for example, which tool youll use and for what purpose. Adhere to this in all languages.respond in the same language as the users query."
                    },
                    {
                        "role": "user",
                        "content": "test short answer."
                    }
                ],
                "think": true,
                "stream": true,
                "options": {
                    "temperature": 0.2,
                    "top_p": 0.35,
                    "num_ctx": 4096,
                    "seed": 42
                }
});

const options = {
  hostname: '127.0.0.1',
  path: '/api/chat',
  port: 11000,
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData),
  },
};

const req = http.request(options, (res) => {
  console.log(`STATUS: ${res.statusCode}`);
  console.log(`HEADERS: ${JSON.stringify(res.headers)}`);
  res.setEncoding('utf8');
  res.on('data', (chunk) => {
    console.log(`BODY: ${chunk}`);
  });
  res.on('end', () => {
    console.log('No more data in response.');
  });
});

req.on('error', (e) => {
  console.error(`problem with request: ${e.message}`);
});

// Write data to request body
req.write(postData);
req.end();