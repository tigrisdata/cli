import { getAuthClient } from '../../auth/client.js';

export async function ui(): Promise<void> {
  console.log('🔐 Tigris User Login');
  try {
    const authClient = getAuthClient();

    // Check if already authenticated
    const isAuth = await authClient.isAuthenticated();
    if (isAuth) {
      console.log('⚠️  You are already logged in.');
      console.log(
        '💡 Run "tigris logout" first if you want to login with a different account.\n'
      );
      return;
    }

    // Initiate login flow
    await authClient.login();
  } catch (error) {
    // Error already logged in the client
    process.exit(1);
  }
}

export default ui;
