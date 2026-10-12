import { Notice } from "@/components/feedback/Notice";
import { getPlatformConfig } from "@/lib/server/platform-config";

export const dynamic = "force-dynamic";

export default async function SignupLayout({ children }: { children: React.ReactNode }) {
  const { signupsOpen } = await getPlatformConfig();
  return (
    <>
      {!signupsOpen && (
        <div className="fixed inset-x-0 top-20 z-40 mx-auto w-[calc(100%-2rem)] max-w-md">
          <Notice tone="warning">New sign-ups are paused right now. Please try again later. Existing accounts can still log in.</Notice>
        </div>
      )}
      {children}
    </>
  );
}
