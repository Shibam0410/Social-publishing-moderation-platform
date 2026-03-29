const http = require('http');
const req = http.request('http://127.0.0.1:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
}, res => {
    let raw = '';
    res.on('data', chunk => raw += chunk);
    res.on('end', () => {
        let json;
        try {
            json = JSON.parse(raw);
        } catch (e) {
            return console.log('Login parse error:', raw);
        }
        const token = json.token;
        if (!token) return console.log('Login failed no token:', raw);
        
        const req2 = http.request('http://127.0.0.1:3000/api/posts', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        }, res2 => {
            let raw2 = '';
            res2.on('data', chunk => raw2 += chunk);
            res2.on('end', () => console.log('✅ Post result:', raw2));
        });
        req2.write(JSON.stringify({ content: "Testing the post creation API from script 127", post_type: 'text' }));
        req2.end();
    });
});
req.on('error', e => console.log('Req error', e));
req.write(JSON.stringify({ email: "shibam.seal4@gmail.com", password: "December05@1996" }));
req.end();
