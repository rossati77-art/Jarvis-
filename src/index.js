const http = require("http");
const { URL } = require("url");
const { createOAuth2Client, getAuthUrl, getTokens } = require("./googleAuth");

const SCOPES = ["https://www.googleapis.com/auth/userinfo.email"];
const PORT = 3000;

const client = createOAuth2Client();

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  if (url.pathname === "/") {
    res.writeHead(302, { Location: getAuthUrl(client, SCOPES) });
    return res.end();
  }

  if (url.pathname === "/oauth2callback") {
    const code = url.searchParams.get("code");
    if (!code) {
      res.writeHead(400);
      return res.end("Missing authorization code");
    }
    const tokens = await getTokens(client, code);
    res.writeHead(200, { "Content-Type": "application/json" });
    return res.end(JSON.stringify(tokens, null, 2));
  }

  res.writeHead(404);
  res.end("Not found");
});

server.listen(PORT, () => {
  console.log(`Open http://localhost:${PORT} to start the Google OAuth2 flow`);
});
