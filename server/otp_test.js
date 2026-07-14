const base = 'http://localhost:3000/api/v1';

(async () => {
  try {
    const requestOtpResp = await fetch(`${base}/auth/request-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mobile: '9876543210' }),
    });
    console.log('request-otp status', requestOtpResp.status);
    console.log(await requestOtpResp.text());

    const verifyOtpResp = await fetch(`${base}/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mobile: '9876543210', otp: '123456' }),
    });
    console.log('verify-otp status', verifyOtpResp.status);
    console.log(await verifyOtpResp.text());
  } catch (error) {
    console.error('error', error);
    process.exit(1);
  }
})();
