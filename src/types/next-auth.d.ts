import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "OWNER";
      email: string;
    };
  }

  interface User {
    role: "OWNER";
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: "OWNER";
  }
}