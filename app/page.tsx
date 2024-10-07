import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";

export default function Home() {
  return (
    <div className='container mx-auto max-w-md p-4'>
      <Card>
        <CardContent>
          <Link href={"/signup"}>
            <Button className='w-full mt-10'>Get Started</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
