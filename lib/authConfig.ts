// lib/authConfig.ts

export const msalConfig = {
  auth: {
    clientId: "821a8f5f-2dbb-436a-b049-eac62bb17edf", // from Microsoft Entra App Registration
    authority: "https://login.microsoftonline.com/f32f5a1d-3fec-43c5-a369-df552f69fa24", // or domain
    redirectUri: process.env.NEXT_PUBLIC_LOCAL_BASE, // or your frontend URL like "http://localhost:3000/"
  },
  cache: {
    cacheLocation: "sessionStorage", // or "localStorage" if you want persistence across tabs
    storeAuthStateInCookie: false,   // set true if dealing with older browsers
  },
};