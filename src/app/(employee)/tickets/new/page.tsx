import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { NewTicketForm } from '@/features/employee/components/NewTicketForm';

export default async function NewTicketPage() {
  const session = await auth();
  if (!session) redirect('/login');

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-foreground">Raise a Ticket</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Describe your issue and our AI will help route it to the right team.
        </p>
      </div>
      <NewTicketForm />
    </div>
  );
}
