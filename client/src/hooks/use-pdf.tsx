import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { apiUrl } from "@/lib/api";
import { type PdfDocument } from "@shared/schema";

export function usePdfDocuments(userId: string) {
  return useQuery<{ success: boolean; documents: PdfDocument[] }>({
    queryKey: ["/api/documents", userId],
    enabled: !!userId,
  });
}

export function useUploadPdfs(userId: string) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (files: FileList) => {
      const formData = new FormData();
      formData.append("userId", userId);
      
      for (let i = 0; i < files.length; i++) {
        formData.append("pdfs", files[i]);
      }

      const response = await fetch(apiUrl("api/documents/upload"), {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        let errorText = "Upload failed";
        try {
          const error = await response.json();
          errorText = error.error || errorText;
        } catch (e) {
          errorText = response.statusText || errorText;
        }
        throw new Error(errorText);
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents", userId] });
    },
  });
}

export function useDeleteDocument(userId: string) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (documentId: string) => {
      console.log("Attempting to delete document:", documentId);
      const response = await apiRequest("DELETE", `/api/documents/${documentId}`);
      const result = await response.json();
      console.log("Delete response:", result);
      return result;
    },
    onSuccess: (data, variables) => {
      console.log("Document deleted successfully, invalidating queries...", data);
      // Force refetch the documents list
      queryClient.invalidateQueries({ 
        queryKey: ["/api/documents", userId],
        refetchType: 'all'
      });
      // Also refetch to ensure immediate update
      queryClient.refetchQueries({ 
        queryKey: ["/api/documents", userId],
        type: 'active'
      });
      // Also invalidate any signature-related queries
      queryClient.invalidateQueries({ 
        queryKey: ["/api/signatures", userId]
      });
    },
    onError: (error: any) => {
      console.error("Delete document error:", error);
    },
  });
}

export function useDocumentSignatures(documentId: string) {
  return useQuery({
    queryKey: ["/api/documents", documentId, "signatures"],
    enabled: !!documentId,
  });
}

export function useApplySignature() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({
      documentId,
      signatureId,
      pageNumbers,
      position,
      password,
    }: {
      documentId: string;
      signatureId: string;
      pageNumbers: number[];
      position: any;
      password?: string;
    }) => {
      const response = await apiRequest("POST", `/api/documents/${documentId}/signatures`, {
        signatureId,
        pageNumbers,
        position,
        password,
      });
      return response.json();
    },
    onSuccess: (data, variables) => {
      // Optimistic update: Add new signatures to cache immediately
      const queryKey = ["/api/documents", variables.documentId, "signatures"];
      const existingData = queryClient.getQueryData(queryKey) as any;
      
      if (existingData && data.appliedSignatures) {
        const updatedSignatures = [...(existingData.signatures || []), ...data.appliedSignatures];
        queryClient.setQueryData(queryKey, {
          ...existingData,
          signatures: updatedSignatures
        });
      }
      
      // Delayed cache validation (only if needed)
      setTimeout(() => {
        queryClient.invalidateQueries({ 
          queryKey,
          refetchType: 'none'
        });
      }, 2000);
    },
  });
}

export function useRemoveSignature() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ documentId, signatureId }: { documentId: string; signatureId: string }) => {
      const response = await apiRequest("DELETE", `/api/documents/${documentId}/signatures/${signatureId}`);
      return response.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["/api/documents", variables.documentId, "signatures"]
      });
    },
  });
}

export function useUpdateSignaturePosition() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({
      documentId,
      signatureId,
      position
    }: {
      documentId: string;
      signatureId: string;
      position: any;
    }) => {
      const response = await apiRequest("PUT", `/api/documents/${documentId}/signatures/${signatureId}/position`, {
        position,
      });
      return response.json();
    },
    onSuccess: (data, variables) => {
      // Optimistic update: Update cache immediately without refetch
      const queryKey = ["/api/documents", variables.documentId, "signatures"];
      const existingData = queryClient.getQueryData(queryKey) as any;
      
      if (existingData && existingData.signatures) {
        const updatedSignatures = existingData.signatures.map((sig: any) => 
          sig.id === variables.signatureId 
            ? { ...sig, position: variables.position }
            : sig
        );
        
        queryClient.setQueryData(queryKey, {
          ...existingData,
          signatures: updatedSignatures
        });
      }
      
      // Only invalidate cache if optimistic update failed
      setTimeout(() => {
        queryClient.invalidateQueries({ 
          queryKey,
          refetchType: 'none' // Don't refetch immediately
        });
      }, 1000);
    },
  });
}

// export function useToggleDocumentReadOnly() {
//   const queryClient = useQueryClient();
//   
//   return useMutation({
//     mutationFn: async ({
//       documentId,
//       isReadOnly
//     }: {
//       documentId: string;
//       isReadOnly: boolean;
//     }) => {
//       const response = await apiRequest("PUT", `/api/documents/${documentId}/readonly`, {
//         isReadOnly,
//       });
//       return response.json();
//     },
//     onSuccess: (data, variables) => {
//       queryClient.invalidateQueries({
//         queryKey: ["/api/documents"]
//       });
//     },
//   });
// }
