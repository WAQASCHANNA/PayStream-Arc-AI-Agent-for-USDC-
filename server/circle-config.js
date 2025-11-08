import axios from 'axios';

const apiKey = process.env.CIRCLE_API_KEY;
if (!apiKey) {
  console.error('CIRCLE_API_KEY is missing. Set it in .env or server/.env');
  process.exit(1);
}

async function main() {
  try {
    const res = await axios.get('https://api-sandbox.circle.com/v1/configuration', {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: 'application/json',
      },
    });
    console.log(JSON.stringify(res.data, null, 2));
  } catch (err) {
    if (err.response) {
      console.error('Request failed:', err.response.status, JSON.stringify(err.response.data));
    } else {
      console.error('Error:', err.message);
    }
    process.exit(1);
  }
}

main();