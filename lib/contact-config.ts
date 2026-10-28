export function getContactConfig() {
  const email = (process.env.COMMISSIONER_EMAIL || "").trim();
  const endpoint = (process.env.CONTACT_FORM_ENDPOINT || "").trim();
  return {
    name: (process.env.COMMISSIONER_NAME || "").trim(),
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : "",
    endpoint: /^https:\/\/formspree\.io\/f\/[A-Za-z0-9]+$/.test(endpoint)
      ? endpoint
      : "",
  };
}
