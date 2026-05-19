import { AuthForm } from "@/components/AuthForm";

type Props = {
  searchParams: Promise<{ callbackUrl?: string }>;
};

export default async function LoginPage({ searchParams }: Props) {
  const params = await searchParams;
  const callbackUrl = params.callbackUrl ?? "/";

  return (
    <main className="app-bg flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <AuthForm mode="login" callbackUrl={callbackUrl} />
      </div>
    </main>
  );
}
