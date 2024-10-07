"use client";

import React, { useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";

enum SignUpStage {
  EMAIL,
  OTP,
  COMPLETE,
}

export default function SignUpPage() {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [votingCode, setVotingCode] = useState("");
  const [stage, setStage] = useState<SignUpStage>(SignUpStage.EMAIL);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/send-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to send OTP");
      }

      setStage(SignUpStage.OTP);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOTPSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/verify-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, otp }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to verify OTP");
      }

      setVotingCode(data.votingCode);
      setStage(SignUpStage.COMPLETE);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className='container mx-auto max-w-md p-4'>
      <Card>
        <CardHeader>
          <CardTitle>Voter Registration</CardTitle>
        </CardHeader>
        <CardContent>
          {stage === SignUpStage.EMAIL && (
            <form onSubmit={handleEmailSubmit} className='space-y-4'>
              <div>
                <Input
                  type='email'
                  placeholder='Enter your email'
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <Button type='submit' disabled={isLoading} className='w-full'>
                {isLoading ? "Sending OTP..." : "Get Verification Code"}
              </Button>
            </form>
          )}

          {stage === SignUpStage.OTP && (
            <form onSubmit={handleOTPSubmit} className='space-y-4'>
              <div>
                <Input
                  type='text'
                  placeholder='Enter OTP'
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  required
                />
              </div>
              <Button type='submit' disabled={isLoading} className='w-full'>
                {isLoading ? "Verifying..." : "Verify OTP"}
              </Button>
            </form>
          )}

          {stage === SignUpStage.COMPLETE && (
            <Alert>
              <AlertDescription>
                Registration successful! Your voting code is:{" "}
                <strong>{votingCode}</strong>
                <br />
                Please save this code. You'll need it to cast your vote.
              </AlertDescription>
            </Alert>
          )}

          {error && (
            <Alert variant='destructive' className='mt-4'>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
