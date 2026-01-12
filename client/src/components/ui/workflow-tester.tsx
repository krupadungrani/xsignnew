import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Circle, FileText, Signature, Grid3X3 } from "lucide-react";

interface WorkflowStep {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  icon: React.ReactNode;
}

export function WorkflowTester() {
  const [steps, setSteps] = useState<WorkflowStep[]>([
    {
      id: "upload",
      title: "Upload Documents",
      description: "Upload one or more PDF documents using the sidebar",
      completed: false,
      icon: <FileText className="h-4 w-4" />
    },
    {
      id: "signature",
      title: "Create Signature",
      description: "Create a digital signature using the 'Create' or 'Draw Signature' buttons",
      completed: false,
      icon: <Signature className="h-4 w-4" />
    },
    {
      id: "single-sign",
      title: "Test Single Document Signing",
      description: "Select a document and use the right panel to apply a signature",
      completed: false,
      icon: <Grid3X3 className="h-4 w-4" />
    },
    {
      id: "multi-sign",
      title: "Test Multi-Document Signing",
      description: "Use the 'Apply Signature to Multiple Documents' button for bulk signing",
      completed: false,
      icon: <Grid3X3 className="h-4 w-4" />
    }
  ]);

  const markStepCompleted = (stepId: string) => {
    setSteps(prev => prev.map(step => 
      step.id === stepId ? { ...step, completed: true } : step
    ));
  };

  const resetWorkflow = () => {
    setSteps(prev => prev.map(step => ({ ...step, completed: false })));
  };

  const completedSteps = steps.filter(step => step.completed).length;
  const totalSteps = steps.length;

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-gray-900 flex items-center">
          <CheckCircle className="h-5 w-5 mr-2 text-green-600" />
          Workflow Tester
        </CardTitle>
        <div className="flex items-center space-x-2">
          <Badge variant={completedSteps === totalSteps ? "default" : "secondary"}>
            {completedSteps}/{totalSteps} Steps
          </Badge>
          {completedSteps === totalSteps && (
            <Badge variant="default" className="bg-green-600">
              Complete! ✅
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {steps.map((step) => (
          <div
            key={step.id}
            className={`flex items-start space-x-3 p-3 rounded-lg transition-colors ${
              step.completed 
                ? 'bg-green-50 border border-green-200' 
                : 'bg-gray-50 border border-gray-200'
            }`}
          >
            <div className="flex-shrink-0 mt-0.5">
              {step.completed ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <Circle className="h-5 w-5 text-gray-400" />
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-1">
                {step.icon}
                <h4 className={`text-sm font-medium ${
                  step.completed ? 'text-green-900' : 'text-gray-900'
                }`}>
                  {step.title}
                </h4>
              </div>
              <p className={`text-xs ${
                step.completed ? 'text-green-700' : 'text-gray-600'
              }`}>
                {step.description}
              </p>
              {!step.completed && (
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-2 text-xs h-6"
                  onClick={() => markStepCompleted(step.id)}
                >
                  Mark Complete
                </Button>
              )}
            </div>
          </div>
        ))}
        
        <div className="pt-3 border-t border-gray-200">
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={resetWorkflow}
          >
            Reset Workflow
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
