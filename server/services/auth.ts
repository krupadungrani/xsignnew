import bcrypt from "bcrypt";
import { storage } from "../storage";
import { type InsertUser } from "../shared/schema";

export class AuthService {
  async register(userData: InsertUser & { password: string }) {
    // Check if user already exists
    const existingUser = await storage.getUserByEmail(userData.email);
    if (existingUser) {
      throw new Error("User already exists with this email");
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(userData.password, 12);
    
    // Create user directly without email verification
    const createdUser = await storage.createUser({
      email: userData.email,
      fullName: userData.fullName,
      companyName: userData.companyName,
      password: hashedPassword,
    });

    // Mark user as verified immediately and clear any token
    const updatedUser = await storage.updateUser(createdUser.id, {
      isVerified: true,
      verificationToken: null,
    });

    const user = updatedUser || createdUser;
    return { ...user, password: undefined };
  }

  async login(email: string, password: string) {
    const user = await storage.getUserByEmail(email);
    if (!user) {
      throw new Error("Invalid credentials");
    }

    if (!user.isVerified) {
      throw new Error("Please verify your email before logging in");
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      throw new Error("Invalid credentials");
    }

    return { ...user, password: undefined };
  }

  async verifyEmail(token: string) {
    try {
      const user = await storage.getUserByVerificationToken(token);
      if (!user) {
        return { success: false, error: "Invalid or expired verification token" };
      }

      await storage.updateUser(user.id, {
        isVerified: true,
        verificationToken: null,
      });

      return { success: true };
    } catch (error) {
      return { success: false, error: "Verification failed" };
    }
  }

  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 12);
  }

  async comparePasswords(password: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
  }
}

export const authService = new AuthService();
