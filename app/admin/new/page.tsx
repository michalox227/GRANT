import { ProgramForm } from "@/components/ProgramForm";

export default function NewProgramPage() {
  return (
    <div className="max-w-4xl mx-auto p-4 space-y-4">
      <h1 className="text-2xl font-bold">Nowy program</h1>
      <ProgramForm />
    </div>
  );
}
