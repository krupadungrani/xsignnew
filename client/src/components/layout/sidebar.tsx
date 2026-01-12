import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useDigitalSignatures } from "@/hooks/use-signature";
import { usePdfDocuments, useUploadPdfs, useDeleteDocument } from "@/hooks/use-pdf";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  FileText,
  Plus,
  Upload,
  ChevronDown,
  Shield,
  Signature,
  Clock,
  Check,
  Eye,
  Tag,
  Trash2,
  Loader2,
  AlertCircle,
  Grid3X3,
  Sparkles,
  Type,
  Pen,
  Trash,
  X,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useCreateSignature, useDeleteSignature } from "@/hooks/use-signature";

import { AdobeStyleSignature } from "@/components/signature/adobe-style-signature";
import { AdobeStyleSignatureModal } from "@/components/signature/adobe-style-signature-modal";
import { SignatureViewer } from "@/components/signature/signature-viewer";
import { type PdfDocument } from "@shared/schema";
import { type DigitalSignature } from "@shared/schema";

const createSignatureSchema = z.object({
  name: z.string().min(1, "Signature name is required"),
  fullName: z.string().min(1, "Full name is required"),
  companyName: z.string().min(1, "Company name is required"),
  location: z.string().min(1, "Location is required"),
  timeZone: z.string().min(1, "Time zone is required"),
});

interface SidebarProps {
  selectedDocument: PdfDocument | null;
  onSelectDocument: (document: PdfDocument) => void;
  onOpenMultiSignature: () => void;
  documents: PdfDocument[];
  signatures: DigitalSignature[];
  onDocumentsRefresh?: () => void;
}

export function Sidebar({ 
  selectedDocument, 
  onSelectDocument, 
  onOpenMultiSignature,
  documents,
  signatures,
  onDocumentsRefresh
}: SidebarProps) {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const [createSignatureOpen, setCreateSignatureOpen] = useState(false);
  const [adobeStyleSignatureOpen, setAdobeStyleSignatureOpen] = useState(false);
  const [adobeStyleSignatureModalOpen, setAdobeStyleSignatureModalOpen] = useState(false);
  const [signatureViewerOpen, setSignatureViewerOpen] = useState(false);
  const [selectedSignature, setSelectedSignature] = useState<DigitalSignature | null>(null);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [bulkDeleteMode, setBulkDeleteMode] = useState(false);
  const [selectedDocumentsForDelete, setSelectedDocumentsForDelete] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);

  const { data: signaturesData } = useDigitalSignatures(user?.id || "");
  const { data: documentsData } = usePdfDocuments(user?.id || "");
  const uploadPdfs = useUploadPdfs(user?.id || "");
  const deleteDocument = useDeleteDocument(user?.id || "");
  const createSignature = user?.id ? useCreateSignature(user.id) : null;
  const deleteSignature = useDeleteSignature(user?.id || "");

  console.log("Sidebar render - Documents data:", {
    userId: user?.id,
    documentsData,
    documentsCount: documentsData?.documents?.length || 0,
    isLoading: documentsData === undefined
  });

  const form = useForm<z.infer<typeof createSignatureSchema>>({
    resolver: zodResolver(createSignatureSchema),
    defaultValues: {
      name: "",
      fullName: user?.fullName || "",
      companyName: user?.companyName || "",
      location: "",
      timeZone: "America/New_York",
    },
  });

  // Use the documents and signatures from props, with fallback to local data
  const displayDocuments = documents.length > 0 ? documents : (documentsData?.documents || []);
  const displaySignatures = signatures.length > 0 ? signatures : (signaturesData?.signatures || []);

  const handleSignatureClick = (signature: DigitalSignature) => {
    setSelectedSignature(signature);
    setSignatureViewerOpen(true);
  };

  const handleDeleteSignature = async (signature: DigitalSignature, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`Are you sure you want to delete "${signature.name}"?`)) {
      try {
        await deleteSignature.mutateAsync(signature.id);
        toast({
          title: "Signature deleted",
          description: "The signature has been deleted successfully.",
        });
      } catch (error: any) {
        toast({
          title: "Delete failed",
          description: error.message || "Failed to delete signature",
          variant: "destructive",
        });
      }
    }
  };



  const handleSaveAdobeStyleSignature = async (signatureData: { 
    signature: string; 
    name: string; 
    metadata?: any; 
    password?: string;
    details?: {
      fullName: string;
      email: string;
      phone: string;
      jobTitle: string;
      department: string;
      companyName: string;
      location: string;
    };
  }) => {
    try {
      if (!createSignature) {
        toast({
          title: "Error",
          description: "Signature creation hook not available. Please refresh the page.",
          variant: "destructive",
        });
        return;
      }

      // Validate password
      if (!signatureData.password || signatureData.password.length < 6) {
        toast({
          title: "Password required",
          description: "Please enter a password with at least 6 characters to protect your signature.",
          variant: "destructive",
        });
        return;
      }

      await createSignature.mutateAsync({
        name: signatureData.name,
        fullName: signatureData.details?.fullName || signatureData.metadata?.fullName || user?.fullName || "",
        companyName: signatureData.details?.companyName || signatureData.metadata?.companyName || user?.companyName || "",
        location: signatureData.details?.location || signatureData.metadata?.location || "Digital",
        timeZone: "UTC",
        signatureImage: signatureData.signature,
        email: signatureData.details?.email || signatureData.metadata?.email || user?.email || "",
        phone: signatureData.details?.phone || signatureData.metadata?.phone || "",
        jobTitle: signatureData.details?.jobTitle || signatureData.metadata?.jobTitle || "",
        department: signatureData.details?.department || signatureData.metadata?.department || "",
        password: signatureData.password || "",
      });
      
      setAdobeStyleSignatureOpen(false);
      toast({
        title: "Adobe-style signature created",
        description: "Your professional Adobe-style signature has been created successfully with password protection.",
      });
    } catch (error: any) {
      console.error("Adobe-style signature creation error:", error);
      toast({
        title: "Creation failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleSaveAdobeStyleSignatureModal = async (signatureData: { 
    signature: string; 
    name: string; 
    metadata?: any; 
    password?: string;
    details?: {
      fullName: string;
      email: string;
      phone: string;
      jobTitle: string;
      department: string;
      companyName: string;
      location: string;
    };
  }) => {
    try {
      if (!createSignature) {
        toast({
          title: "Error",
          description: "Signature creation hook not available. Please refresh the page.",
          variant: "destructive",
        });
        return;
      }

      // Validate password
      if (!signatureData.password || signatureData.password.length < 6) {
        toast({
          title: "Password required",
          description: "Please enter a password with at least 6 characters to protect your signature.",
          variant: "destructive",
        });
        return;
      }

      await createSignature.mutateAsync({
        name: signatureData.name,
        fullName: signatureData.details?.fullName || signatureData.metadata?.fullName || user?.fullName || "",
        companyName: signatureData.details?.companyName || signatureData.metadata?.companyName || user?.companyName || "",
        location: signatureData.details?.location || signatureData.metadata?.location || "Digital",
        timeZone: "UTC",
        signatureImage: signatureData.signature,
        email: signatureData.details?.email || signatureData.metadata?.email || user?.email || "",
        phone: signatureData.details?.phone || signatureData.metadata?.phone || "",
        jobTitle: signatureData.details?.jobTitle || signatureData.metadata?.jobTitle || "",
        department: signatureData.details?.department || signatureData.metadata?.department || "",
        password: signatureData.password || "",
      });
      
      setAdobeStyleSignatureModalOpen(false);
      toast({
        title: "Adobe-style signature modal created",
        description: "Your professional Adobe-style signature has been created successfully with password protection.",
      });
    } catch (error: any) {
      console.error("Adobe-style signature modal creation error:", error);
      toast({
        title: "Creation failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    console.log("File upload started:", {
      fileCount: files.length,
      files: Array.from(files).map(f => ({ name: f.name, size: f.size, type: f.type }))
    });

    try {
      console.log("Calling uploadPdfs.mutateAsync...");
      const result = await uploadPdfs.mutateAsync(files);
      console.log("Upload result:", result);
      
      toast({
        title: "Upload successful",
        description: `${files.length} PDF(s) uploaded successfully.`,
      });
      setFileInputKey(prev => prev + 1); // Reset file input
      
      // Force refresh of documents list
      console.log("Upload successful, documents should refresh");
      
    } catch (error: any) {
      console.error("File upload error:", error);
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleCreateSignature = async (values: z.infer<typeof createSignatureSchema>) => {
    try {
      console.log("Creating signature with values:", values);
      console.log("User data:", { id: user?.id, email: user?.email });
      
      if (!user?.id) {
        toast({
          title: "Authentication error",
          description: "User ID not found. Please log in again.",
          variant: "destructive",
        });
        return;
      }

      if (!createSignature) {
        toast({
          title: "Error",
          description: "Signature creation hook not available. Please refresh the page.",
          variant: "destructive",
        });
        return;
      }

      await createSignature.mutateAsync({
        userId: user.id,
        ...values,
        email: user.email,
      });
      setCreateSignatureOpen(false);
      form.reset();
      toast({
        title: "Signature created",
        description: "Your digital signature has been created successfully.",
      });
    } catch (error: any) {
      console.error("Signature creation error:", error);
      toast({
        title: "Creation failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDeleteDocument = async (documentId: string) => {
    try {
      console.log("Deleting document:", documentId);
      
      // Show loading state
      toast({
        title: "Deleting document",
        description: "Please wait while the document is being deleted...",
      });
      
      const result = await deleteDocument.mutateAsync(documentId);
      
      console.log("Delete result:", result);
      
      // Check if the deletion was actually successful
      if (result && (result.success || result.message)) {
        toast({
          title: "Document deleted successfully",
          description: `The document has been deleted successfully.${result?.signaturesDeleted ? ` ${result.signaturesDeleted} signature(s) were also removed.` : ''}`,
        });
        
        // Clear selected document if it was the one deleted
        if (selectedDocument?.id === documentId) {
          console.log("Clearing selected document");
          onSelectDocument(null as any);
        }
        
        // Force immediate refresh of documents list
        console.log("Forcing documents refetch after successful deletion");
        if (onDocumentsRefresh) {
          onDocumentsRefresh();
        } else {
          window.dispatchEvent(new CustomEvent('documents-refresh'));
        }
        
        // Also trigger a small delay refresh to ensure everything is updated
        setTimeout(() => {
          console.log("Delayed refresh to ensure complete update");
          if (onDocumentsRefresh) {
            onDocumentsRefresh();
          }
        }, 500);
      } else {
        // Handle case where deletion appears to succeed but doesn't
        throw new Error("Delete operation completed but document may not have been removed");
      }
      
    } catch (error: any) {
      console.error("Delete document error:", error);
      
      // Handle specific error cases
      if (error.message?.includes("not found")) {
        toast({
          title: "Document not found",
          description: "This document may have already been deleted or is corrupted.",
          variant: "destructive",
        });
      } else if (error.message?.includes("permission")) {
        toast({
          title: "Permission denied",
          description: "You don't have permission to delete this document.",
          variant: "destructive",
        });
      } else if (error.message?.includes("500")) {
        toast({
          title: "Server Error",
          description: "Server error occurred while deleting. This might be due to applied signatures. Please try again.",
          variant: "destructive",
        });
      } else if (error.message?.includes("foreign key") || error.message?.includes("constraint")) {
        toast({
          title: "Delete Failed",
          description: "Cannot delete document with applied signatures. Please remove signatures first or try again.",
          variant: "destructive",
        });
      } else if (error.message?.includes("Delete operation completed but document may not have been removed")) {
        toast({
          title: "Delete Status Unknown",
          description: "The delete operation completed but we couldn't verify if the document was removed. Please refresh the page.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Delete failed",
          description: error.message || "Failed to delete document. Please try again.",
          variant: "destructive",
        });
      }
      
      // Even on error, try to refresh the documents list
      if (onDocumentsRefresh) {
        onDocumentsRefresh();
      }
    }
  };

  const handleBulkDelete = async () => {
    if (selectedDocumentsForDelete.size === 0) {
      toast({
        title: "No documents selected",
        description: "Please select documents to delete.",
        variant: "destructive",
      });
      return;
    }

    setIsDeleting(true);
    let successCount = 0;
    let errorCount = 0;

    try {
      const deletePromises = Array.from(selectedDocumentsForDelete).map(async (documentId) => {
        try {
          await deleteDocument.mutateAsync(documentId);
          successCount++;
        } catch (error) {
          console.error(`Failed to delete document ${documentId}:`, error);
          errorCount++;
        }
      });

      await Promise.all(deletePromises);

      if (successCount > 0) {
        toast({
          title: "Bulk delete completed",
          description: `Successfully deleted ${successCount} document(s)${errorCount > 0 ? `, ${errorCount} failed` : ''}.`,
        });
      }

      if (errorCount > 0 && successCount === 0) {
        toast({
          title: "Bulk delete failed",
          description: `Failed to delete ${errorCount} document(s).`,
          variant: "destructive",
        });
      }

      // Reset bulk delete state
      setBulkDeleteMode(false);
      setSelectedDocumentsForDelete(new Set());
      
      // Clear selected document if it was deleted
      if (selectedDocument && selectedDocumentsForDelete.has(selectedDocument.id)) {
        onSelectDocument(null as any);
      }
      
      if (onDocumentsRefresh) {
        onDocumentsRefresh();
      }
    } catch (error: any) {
      toast({
        title: "Bulk delete error",
        description: error.message || "An error occurred during bulk delete.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSelectAllForDelete = () => {
    if (selectedDocumentsForDelete.size === displayDocuments.length) {
      // Deselect all
      setSelectedDocumentsForDelete(new Set());
    } else {
      // Select all
      setSelectedDocumentsForDelete(new Set(displayDocuments.map(doc => doc.id)));
    }
  };

  const handleDocumentSelectForDelete = (documentId: string) => {
    setSelectedDocumentsForDelete(prev => {
      const newSet = new Set(prev);
      if (newSet.has(documentId)) {
        newSet.delete(documentId);
      } else {
        newSet.add(documentId);
      }
      return newSet;
    });
  };

  const getDocumentStatus = (doc: PdfDocument) => {
    // Use the status field from the document if available
    if (doc.status) {
      return doc.status;
    }
    
    // Fallback: Check if the document has any applied signatures
    // For now, we'll return "pending" but this should be updated
    // to check actual applied signatures from the database
    return "pending"; // TODO: Implement proper status checking
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "processed":
        return (
          <Badge variant="secondary" className="bg-green-100 text-green-800">
            <Check className="mr-1 h-3 w-3" />
            Ready
          </Badge>
        );
      case "processing":
        return (
          <Badge variant="secondary" className="bg-blue-100 text-blue-800">
            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
            Processing
          </Badge>
        );
      case "pending":
        return (
          <Badge variant="secondary" className="bg-gray-100 text-gray-800">
            <Clock className="mr-1 h-3 w-3" />
            Pending
          </Badge>
        );
      case "error":
        return (
          <Badge variant="secondary" className="bg-red-100 text-red-800">
            <AlertCircle className="mr-1 h-3 w-3" />
            Error
          </Badge>
        );
      case "signed":
        return (
          <Badge variant="secondary" className="bg-green-100 text-green-800">
            <Check className="mr-1 h-3 w-3" />
            Signed
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary" className="bg-gray-100 text-gray-800">
            <Clock className="mr-1 h-3 w-3" />
            Pending
          </Badge>
        );
    }
  };

  const canUseMultiSignature = displayDocuments.length > 0 && displaySignatures.length > 0;

  return (
    <div className="w-full lg:w-80 sticky top-0 h-[100vh] flex flex-col border-r border-blue-200/50">
      {/* Header */}
      <div className="px-4 py-4 border-b overflow-y-auto border-blue-200/50 bg-gradient-to-r from-blue-600 to-indigo-700 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold" data-testid="app-title">XSignature</h1>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
              <span className="text-xs text-white font-medium" data-testid="user-initials">
                {user?.fullName?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'}
              </span>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="text-white hover:!text-white hover:bg-white/20" data-testid="user-menu-trigger">
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={logout} data-testid="button-logout">
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>


      {/* Digital Signatures Section */}
      <div className="px-4 py-4 border-b border-blue-200/50">
        <div className="flex items-center justify-between mb-6 w-100">
          <div className="flex flex-col gap-4 w-full">
             {canUseMultiSignature && (
              <div className="w-full">
                    <Button
                    onClick={onOpenMultiSignature}
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white font-medium rounded-md transition-all duration-200 hover:scale-[1.02]"
                    data-testid="button-multi-signature"
                  >
                    <Signature className="mr-2 h-4 w-4" />
                    Bulk Sign
                  </Button>
              </div>
            )}
      
          <div className="space-y-2">
            {/* <Button
              variant="outline"
              className="w-full bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 hover:from-blue-100 hover:to-indigo-100"
              onClick={() => setAdobeStyleSignatureOpen(true)}
              data-testid="button-adobe-signature"
            >
              <Type className="mr-2 h-4 w-4 text-blue-600" />
              Adobe-Style Signature
            </Button> */}
            <Button
              variant="outline"
              className="w-full hover:!text-green-600 bg-gradient-to-r from-green-50 to-emerald-50 border-green-200 hover:from-green-100 hover:to-emerald-100 transition-all duration-200 hover:scale-[1.02]"
              onClick={() => setAdobeStyleSignatureModalOpen(true)}
              data-testid="button-adobe-signature-modal"
            >
              <Pen className="mr-2 h-4 w-4 text-green-600" />
              Add Signature
            </Button>
          </div>
          </div>

              <Dialog open={createSignatureOpen} onOpenChange={setCreateSignatureOpen}>
            <DialogContent className="sm:max-w-md" data-testid="create-signature-modal">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Tag className="h-5 w-5 text-primary" />
                  Create Digital Signature
                </DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleCreateSignature)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Signature Name</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="e.g., John Doe - Corporate" 
                            {...field} 
                            data-testid="input-signature-name"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="fullName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Enter your full name" 
                            {...field} 
                            data-testid="input-full-name"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="companyName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Company Name</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Enter company name" 
                            {...field} 
                            data-testid="input-company-name"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="location"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Location</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Enter location" 
                            {...field} 
                            data-testid="input-location"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="timeZone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Time Zone</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-timezone">
                              <SelectValue placeholder="Select time zone" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="America/New_York">Eastern Time (EST)</SelectItem>
                            <SelectItem value="America/Chicago">Central Time (CST)</SelectItem>
                            <SelectItem value="America/Denver">Mountain Time (MST)</SelectItem>
                            <SelectItem value="America/Los_Angeles">Pacific Time (PST)</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                    <div className="flex gap-2">
                      <Tag className="h-4 w-4 text-blue-600 mt-0.5" />
                      <div className="text-sm text-blue-800">
                        <p className="font-medium">Digital Tag</p>
                        <p>A cryptographic certificate will be generated for signature authenticity and verification.</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end space-x-3">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setCreateSignatureOpen(false)}
                      data-testid="button-cancel-signature"
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={createSignature?.isPending}
                      data-testid="button-generate-signature"
                    >
                      {createSignature?.isPending && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      <Tag className="mr-2 h-4 w-4" />
                      Generate
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
        
        <div className="space-y-2 max-h-[120px] overflow-y-auto signatures-list">
          {displaySignatures.map((signature) => (
            <div 
              key={signature.id} 
              className="flex items-center justify-between p-1 bg-gray-50 rounded-md hover:bg-gray-100 cursor-pointer transition-colors duration-200 group border border-transparent hover:border-gray-300"
              onClick={() => handleSignatureClick(signature)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleSignatureClick(signature);
                }
              }}
              tabIndex={0}
              role="button"
              aria-label={`View signature details for ${signature.name}`}
              data-testid={`signature-item-${signature.id}`}
            >
              <div className="flex items-center space-x-3 flex-1">
                <Signature className="h-4 w-4 text-primary" />
                <span className="text-sm text-gray-700 group-hover:text-gray-900 font-medium" data-testid={`signature-name-${signature.id}`}>
                  {signature.name}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <Shield className="h-4 w-4 text-green-600" />
                <span className="text-xs text-gray-500 group-hover:text-gray-600 transition-colors duration-200">
                  Click to view
                </span>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={(e) => handleDeleteSignature(signature, e)}
                  className="h-6 w-6 p-0 text-white hover:bg-red-700 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                  data-testid={`button-delete-signature-${signature.id}`}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
          {displaySignatures.length === 0 && (
            <div className="text-center py-8">
              <Signature className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-500 mb-2" data-testid="no-signatures">
                No signatures created yet
              </p>
              <p className="text-xs text-gray-400">
                Create your first digital signature to get started
              </p>
            </div>
          )}
        </div>
      </div>

      {/* PDF Files Section */}
      <div className="flex-1 flex flex-col min-h-0 pdf-documents-section">
        <div className="px-6 py-4 border-b border-blue-200/50">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-800">Total PDFs ({documents?.length || 0})</h3>
            <div className="flex items-center space-x-2">
                  <input
                    key={fileInputKey}
                    type="file"
                    multiple
                    accept=".pdf"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="pdf-upload"
                    data-testid="input-file-upload"
                  />
                  <Button 
                    asChild 
                    size="sm" 
                    disabled={uploadPdfs.isPending}
                    className="bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white font-medium rounded-md hover:shadow-xl transition-all duration-200 hover:scale-[1.02]"
                    data-testid="button-upload-pdfs"
                  >
                    <label htmlFor="pdf-upload" className="cursor-pointer">
                      {uploadPdfs.isPending ? (
                        <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                      ) : (
                        <Upload className="mr-1 h-4 w-4" />
                      )}
                      Upload
                    </label>
                  </Button>
            </div>
                      </div>
            <div className="flex w-full items-center space-x-2">
           {!bulkDeleteMode ? (
        <>
              {displayDocuments.length > 0 && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setBulkDeleteMode(true)}
                className="border-red-300 w-full hover:!text-red-600 !rounded-md text-red-600 hover:bg-red-50 hover:border-red-400"
              >
                <Trash className="mr-1 h-4 w-4" />
                Delete All
              </Button>
            )}
            </>
          ) : (
            <Dialog open={bulkDeleteMode} onOpenChange={setBulkDeleteMode}>
              <DialogContent className="sm:max-w-md rounded-xl shadow-xl">
                <DialogHeader>
                  <DialogTitle className="text-lg font-semibold text-red-600 flex items-center gap-2">
                    <Trash className="h-5 w-5" /> Confirm Bulk Delete
                  </DialogTitle>
                         {/* Bulk Delete Mode Controls */}
                        {bulkDeleteMode && (
                          <div className="flex items-center !my-6 justify-between p-3 bg-red-50 border border-red-200 rounded-lg">
                            <div className="flex items-center space-x-3">
                              <Checkbox
                              className="border-red-300 hover:border-red-400 checked:!bg-red-600"
                                checked={selectedDocumentsForDelete.size === displayDocuments.length && displayDocuments.length > 0}
                                onCheckedChange={handleSelectAllForDelete}
                              />
                              <span className="text-sm font-medium text-red-800">
                                Select All ({selectedDocumentsForDelete.size}/{displayDocuments.length})
                              </span>
                            </div>
                            <div className="text-xs text-red-600">
                              Select documents to delete
                            </div>
                          </div>
                        )}
                  <p className="text-xs text-gray-500">
                    Are you sure you want to delete{" "}
                    <span className="font-semibold text-red-600">
                      {selectedDocumentsForDelete.size}
                    </span>{" "}
                    document(s)? This action cannot be undone.
                  </p>
                </DialogHeader>

                <div className="flex justify-end gap-3 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setBulkDeleteMode(false);
                      setSelectedDocumentsForDelete(new Set());
                    }}
                    className="border-gray-300 text-gray-600 hover:bg-gray-50"
                  >
                    <X className="mr-1 h-4 w-4" />
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={handleBulkDelete}
                    disabled={selectedDocumentsForDelete.size === 0 || isDeleting}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    {isDeleting ? (
                      <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                    ) : (
                      <Trash className="mr-1 h-4 w-4" />
                    )}
                    Delete ({selectedDocumentsForDelete.size})
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}

            </div>
        
        </div>
        
        {/* PDF File List */}
        <ScrollArea className="flex-1 px-6 py-2 custom-scrollbar min-h-0 pdf-documents-list">
          <div className="space-y-2">
            {displayDocuments.map((doc) => {
              const isSelectedForDelete = selectedDocumentsForDelete.has(doc.id);
              const isSelected = selectedDocument?.id === doc.id;
              
              return (
                <div 
                  key={doc.id}
                  className={`p-2 border rounded-xl transition-all duration-200 ${
                    bulkDeleteMode 
                      ? isSelectedForDelete 
                        ? 'bg-red-50 border-red-300 shadow-lg' 
                        : 'bg-white border-gray-200 hover:border-red-300 hover:bg-red-50/50'
                      : isSelected 
                        ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-400 shadow-lg cursor-pointer' 
                        : 'border-blue-200/50 hover:border-blue-300 hover:bg-blue-50/50 cursor-pointer'
                  }`}
                  onClick={bulkDeleteMode ? undefined : () => onSelectDocument(doc)}
                  data-testid={`document-item-${doc.id}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        {bulkDeleteMode && (
                          <Checkbox
                            checked={isSelectedForDelete}
                            onCheckedChange={() => handleDocumentSelectForDelete(doc.id)}
                            onClick={(e) => e.stopPropagation()}
                          />
                        )}
                        <FileText className="h-4 w-4 text-red-500" />
                        <span className="font-medium text-sm text-gray-900" data-testid={`document-name-${doc.id}`}>
                          {doc.originalName}
                        </span>
                        {/* {!bulkDeleteMode && isSelected && (
                          <Eye className="h-4 w-4 text-primary" />
                        )} */}
                      </div>
                    <p className="text-xs text-gray-500" data-testid={`document-details-${doc.id}`}>
                      {doc.pageCount} pages • {(doc.fileSize / 1024 / 1024).toFixed(1)} MB
                    </p>
                    <div className="mt-2 flex items-center justify-between">
                      {getStatusBadge(getDocumentStatus(doc))}
                      {!bulkDeleteMode && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(`Are you sure you want to delete "${doc.originalName}"?`)) {
                              handleDeleteDocument(doc.id);
                            }
                          }}
                          className="h-8 w-8 p-0 text-white hover:bg-red-700"
                          data-testid={`button-delete-${doc.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    </div>
                  </div>
                </div>
              );
            })}
            {displayDocuments.length === 0 && (
              <div className="text-center py-12" data-testid="no-documents">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FileText className="h-8 w-8 text-blue-400" />
                </div>
                <p className="text-sm font-medium text-gray-700 mb-2">No documents uploaded yet</p>
                <p className="text-xs text-gray-500">Upload PDF files to get started with digital signatures</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
      
      {/* Signature Viewer Modal */}
              <SignatureViewer
          open={signatureViewerOpen}
          onOpenChange={setSignatureViewerOpen}
          signature={selectedSignature}
        />

        <AdobeStyleSignature
          open={adobeStyleSignatureOpen}
          onOpenChange={setAdobeStyleSignatureOpen}
          onSave={handleSaveAdobeStyleSignature}
        />

        <AdobeStyleSignatureModal
          open={adobeStyleSignatureModalOpen}
          onOpenChange={setAdobeStyleSignatureModalOpen}
          onSave={handleSaveAdobeStyleSignatureModal}
        />
      </div>
    );
  }
