import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Mail, Lock, User, Building2, Eye, EyeOff, CheckCircle, Sparkles, Shield, Zap, Globe, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { FloatingElements } from "./floating-elements";
import { apiUrl } from "@/lib/api";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

const registerSchema = z.object({
  fullName: z.string().min(1, "Full name is required"),
  email: z.string().email("Invalid email address"),
  companyName: z.string().min(1, "Company name is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

interface LandingPageProps {
  onClose: () => void;
}

export function LandingPage({ onClose }: LandingPageProps) {
  const [activeTab, setActiveTab] = useState("signin");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showEmailSent, setShowEmailSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [resendEmail, setResendEmail] = useState("");
  const { login, register } = useAuth();
  const { toast } = useToast();

  const loginForm = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const registerForm = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: "",
      email: "",
      companyName: "",
      password: "",
      confirmPassword: "",
    },
  });

  const onLogin = async (values: z.infer<typeof loginSchema>) => {
    setIsLoading(true);
    try {
      await login(values.email, values.password);
      onClose();
      toast({
        title: "Welcome back!",
        description: "You have successfully signed in.",
      });
    } catch (error: any) {
      toast({
        title: "Login failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const onRegister = async (values: z.infer<typeof registerSchema>) => {
    setIsLoading(true);
    try {
      await register({
        fullName: values.fullName,
        email: values.email,
        companyName: values.companyName,
        password: values.password,
      });
      // No email verification needed now
      onClose();
      toast({
        title: "Account created!",
        description: "You are signed in.",
      });
    } catch (error: any) {
      toast({
        title: "Registration failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (!resendEmail) return;
    
    setIsLoading(true);
    try {
      const response = await fetch(apiUrl('api/auth/resend-verification'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resendEmail }),
      });
      
      if (response.ok) {
        toast({
          title: "Verification email sent!",
          description: "Please check your email (or server console) for the verification link.",
        });
      } else {
        const error = await response.json();
        toast({
          title: "Failed to resend",
          description: error.error || "Failed to resend verification email",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Failed to resend",
        description: "Network error. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const features = [
    { icon: Shield, title: "Secure Signatures", description: "Bank-level encryption for your documents" },
    { icon: Zap, title: "Lightning Fast", description: "Sign documents in seconds, not minutes" },
    { icon: Globe, title: "Global Access", description: "Sign from anywhere, anytime, any device" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex flex-col lg:flex-row">
      {/* Left Side - Branding & Features */}
      <motion.div 
        className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-600 via-indigo-700 to-purple-800 text-white p-6 lg:p-10 flex-col justify-between relative overflow-hidden"
        initial={{ x: -100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      >
        <FloatingElements />
        {/* Header */}
        <div className="space-y-4 z-10 relative">
          <motion.div 
            className="flex items-center space-x-3"
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.6 }}
          >
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-3xl font-bold">XSignature</h1>
          </motion.div>
          
          <motion.h2 
            className="text-3xl font-bold leading-tight"
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.6 }}
          >
            Transform Your Digital<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-orange-300">
              Signature Experience
            </span>
          </motion.h2>
          
        </div>

        {/* Features */}
        <motion.div     
          className="space-y-6"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.6 }}
        >
          <h3 className="text-xl font-semibold text-blue-100">Why Choose XSignature?</h3>
          <div className="space-y-4">
            {features.map((feature, index) => (
              <motion.div 
                key={feature.title}
                className="flex items-center space-x-4 p-4 bg-white/10 rounded-xl backdrop-blur-sm"
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 1 + index * 0.1, duration: 0.6 }}
              >
                <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                  <feature.icon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h4 className="font-semibold text-white">{feature.title}</h4>
                  <p className="text-blue-100 text-sm">{feature.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Footer */}
        <motion.div 
          className="text-center text-blue-200"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 1.2, duration: 0.6 }}
        >
          <p className="text-sm mt-6">© 2024 XSignature. All rights reserved.</p>
        </motion.div>
      </motion.div>

      {/* Right Side - Auth Forms */}
      <motion.div 
        className="w-full lg:w-1/2 flex items-center justify-center p-4 sm:p-6 lg:p-12 min-h-screen lg:min-h-0"
        initial={{ x: 100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      >
        <div className="w-full max-w-sm sm:max-w-md space-y-6 sm:space-y-8">
          {/* Mobile Logo */}
          <motion.div 
            className="lg:hidden text-center mb-6 sm:mb-8"
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.6 }}
          >
            <div className="flex items-center justify-center space-x-2 sm:space-x-3 mb-3 sm:mb-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-600 rounded-xl flex items-center justify-center">
                <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">XSignature</h1>
            </div>
          </motion.div>

          {/* Tab Navigation */}
          <motion.div 
            className="bg-white rounded-xl sm:rounded-2xl p-1 shadow-lg"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.6 }}
          >
            <div className="flex relative">
              <motion.div
                className="absolute inset-0 bg-blue-600 rounded-lg sm:rounded-xl"
                initial={false}
                animate={{ 
                  x: activeTab === "signin" ? 0 : "100%",
                  width: "50%"
                }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              />
              
              <button
                onClick={() => setActiveTab("signin")}
                className={`relative z-10 flex-1 py-2.5 sm:py-3 px-4 sm:px-6 text-xs sm:text-sm font-medium rounded-lg sm:rounded-xl transition-colors ${
                  activeTab === "signin" ? "text-white" : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Sign In
              </button>
              <button
                onClick={() => setActiveTab("register")}
                className={`relative z-10 flex-1 py-2.5 sm:py-3 px-4 sm:px-6 text-xs sm:text-sm font-medium rounded-lg sm:rounded-xl transition-colors ${
                  activeTab === "register" ? "text-white" : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Register
              </button>
            </div>
          </motion.div>

          {/* Forms */}
          <AnimatePresence mode="wait">
            {activeTab === "signin" && (
              <motion.div
                key="signin-form"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-4 sm:space-y-6"
              >
                <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-3 sm:space-y-4">
                  <div className="space-y-1.5 sm:space-y-2">
                    <label className="text-sm font-medium text-gray-700">Email</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        {...loginForm.register("email")}
                        type="email"
                        placeholder="Enter your email"
                        className="pl-10 h-11 sm:h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500 transition-all duration-200 hover:border-gray-300"
                        />
                      </div>
                    {loginForm.formState.errors.email && (
                      <p className="text-sm text-red-600">{loginForm.formState.errors.email.message}</p>
                    )}
                  </div>

                  <div className="space-y-1.5 sm:space-y-2">
                    <label className="text-sm font-medium text-gray-700">Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        {...loginForm.register("password")}
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your password"
                        className="pl-10 pr-10 h-11 sm:h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500 transition-all duration-200 hover:border-gray-300"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {loginForm.formState.errors.password && (
                      <p className="text-sm text-red-600">{loginForm.formState.errors.password.message}</p>
                    )}
                  </div>

                                                         <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full h-11 sm:h-12 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg sm:rounded-xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                  >
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <Lock className="w-4 h-4 mr-2" />
                    )}
                    Sign In
                  </Button>
                </form>
              </motion.div>
            )}

            {activeTab === "register" && (
              <motion.div
                key="register-form"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-4 sm:space-y-6"
              >
                {!showEmailSent ? (
                  <form onSubmit={registerForm.handleSubmit(onRegister)} className="space-y-3 sm:space-y-4">
                    <div className="space-y-1.5 sm:space-y-2">
                      <label className="text-sm font-medium text-gray-700">Full Name</label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                          {...registerForm.register("fullName")}
                          type="text"
                          placeholder="Enter your full name"
                          className="pl-10 h-11 sm:h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500 transition-all duration-200 hover:border-gray-300"
                        />
                      </div>
                      {registerForm.formState.errors.fullName && (
                        <p className="text-sm text-red-600">{registerForm.formState.errors.fullName.message}</p>
                      )}
                    </div>

                    <div className="space-y-1.5 sm:space-y-2">
                      <label className="text-sm font-medium text-gray-700">Email</label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                          {...registerForm.register("email")}
                          type="email"
                          placeholder="Enter your email"
                          className="pl-10 h-11 sm:h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500 transition-all duration-200 hover:border-gray-300"
                        />
                      </div>
                      {registerForm.formState.errors.email && (
                        <p className="text-sm text-red-600">{registerForm.formState.errors.email.message}</p>
                      )}
                    </div>

                    <div className="space-y-1.5 sm:space-y-2">
                      <label className="text-sm font-medium text-gray-700">Company Name</label>
                      <div className="relative">
                        <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                          {...registerForm.register("companyName")}
                          type="text"
                          placeholder="Enter your company name"
                          className="pl-10 h-11 sm:h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500 transition-all duration-200 hover:border-gray-300"
                        />
                      </div>
                      {registerForm.formState.errors.companyName && (
                        <p className="text-sm text-red-600">{registerForm.formState.errors.companyName.message}</p>
                      )}
                    </div>

                    <div className="space-y-1.5 sm:space-y-2">
                      <label className="text-sm font-medium text-gray-700">Password</label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                          {...registerForm.register("password")}
                          type={showPassword ? "text" : "password"}
                          placeholder="Create a password"
                          className="pl-10 pr-10 h-11 sm:h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500 transition-all duration-200 hover:border-gray-300"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      {registerForm.formState.errors.password && (
                        <p className="text-sm text-red-600">{registerForm.formState.errors.password.message}</p>
                      )}
                    </div>

                    <div className="space-y-1.5 sm:space-y-2">
                      <label className="text-sm font-medium text-gray-700">Confirm Password</label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                          {...registerForm.register("confirmPassword")}
                          type={showConfirmPassword ? "text" : "password"}
                          placeholder="Confirm your password"
                          className="pl-10 pr-10 h-11 sm:h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500 transition-all duration-200 hover:border-gray-300"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      {registerForm.formState.errors.confirmPassword && (
                        <p className="text-sm text-red-600">{registerForm.formState.errors.confirmPassword.message}</p>
                      )}
                    </div>

                                         <Button
                      type="submit"
                      disabled={isLoading}
                      className="w-full h-11 sm:h-12 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg sm:rounded-xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                    >
                       {isLoading ? (
                         <Loader2 className="w-4 h-4 animate-spin mr-2" />
                       ) : (
                         <CheckCircle className="w-4 h-4 mr-2" />
                       )}
                       Create Account
                     </Button>
                  </form>
                ) : (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center space-y-4"
                  >
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                      <CheckCircle className="w-8 h-8 text-green-600" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900">Check Your Email!</h3>
                    <p className="text-gray-600">
                      We've sent you a verification link. Please check your email and click the link to verify your account.
                      <br />
                      <span className="text-sm text-blue-600 mt-2 block">
                        💡 Development Mode: Check the server console for the verification link
                      </span>
                    </p>
                    <div className="space-y-3">
                      <Button
                        onClick={handleResendVerification}
                        disabled={isLoading}
                        variant="outline"
                        className="w-full"
                      >
                        {isLoading ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Mail className="mr-2 h-4 w-4" />
                        )}
                        Resend Verification Email
                      </Button>
                      <Button
                        onClick={() => setShowEmailSent(false)}
                        variant="ghost"
                        className="w-full"
                      >
                        Back to Sign In
                      </Button>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
