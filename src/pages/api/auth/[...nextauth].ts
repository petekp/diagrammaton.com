import NextAuth from "next-auth";
import { authOptions } from "~/server/auth";

export { authOptions };

export default NextAuth(authOptions);
