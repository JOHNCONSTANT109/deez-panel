import { FileQuestion } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6">
      <div className="bg-primary/10 p-6 rounded-full border border-primary/20">
        <FileQuestion className="w-16 h-16 text-primary" />
      </div>
      <div>
        <h1 className="text-4xl font-bold font-mono tracking-tight">404_NOT_FOUND</h1>
        <p className="text-muted-foreground mt-2 max-w-md mx-auto">
          The module or deployment you are looking for does not exist in the current system state.
        </p>
      </div>
      <Button asChild>
        <Link href="/">Return to Dashboard</Link>
      </Button>
    </div>
  );
}
