"use client";

import React, { useState, useEffect } from "react";
import {
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  doc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

const ADMIN_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD;

export default function AdminPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [stats, setStats] = useState({ total: 0, pending: 0 });
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [enteredPassword, setEnteredPassword] = useState("");

  useEffect(() => {
    if (isAuthenticated) {
      fetchStats();
    }
  }, [isAuthenticated]);

  const fetchStats = async () => {
    try {
      const votersRef = collection(db, "voters");
      const allVotersQuery = query(votersRef);
      const pendingEmailsQuery = query(
        votersRef,
        where("emailSent", "==", false)
      );

      const [allVotersSnapshot, pendingEmailsSnapshot] = await Promise.all([
        getDocs(allVotersQuery),
        getDocs(pendingEmailsQuery),
      ]);

      setStats({
        total: allVotersSnapshot.size,
        pending: pendingEmailsSnapshot.size,
      });
    } catch (err) {
      console.error("Error fetching stats:", err);
    }
  };

  const sendEmails = async () => {
    setIsLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/send-voter-emails", {
        method: "POST",
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to send emails");
      }

      setSuccess(`Successfully sent ${data.sentCount} emails`);
      fetchStats(); // Refresh stats
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordSubmit = () => {
    if (enteredPassword === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
    } else {
      setError("Incorrect password");
    }
  };

  if (!isAuthenticated) {
    return (
      <div className='container mx-auto max-w-md p-4'>
        <Card>
          <CardHeader>
            <CardTitle>Admin Login</CardTitle>
          </CardHeader>
          <CardContent>
            <input
              type='password'
              placeholder='Enter Password'
              value={enteredPassword}
              onChange={(e) => setEnteredPassword(e.target.value)}
              className='w-full mb-4 p-2 border'
            />
            <Button onClick={handlePasswordSubmit} className='w-full mb-5'>
              Submit
            </Button>
            {error && (
              <Alert variant='destructive'>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className='container mx-auto max-w-md p-4'>
      <Card>
        <CardHeader>
          <CardTitle>Admin Dashboard</CardTitle>
        </CardHeader>
        <CardContent>
          <div className='space-y-4'>
            <div className='grid grid-cols-2 gap-4'>
              <div className='p-4 bg-gray-100 rounded'>
                <div className='text-sm text-gray-500'>Total Registered</div>
                <div className='text-2xl font-bold'>{stats.total}</div>
              </div>
              <div className='p-4 bg-gray-100 rounded'>
                <div className='text-sm text-gray-500'>Pending Emails</div>
                <div className='text-2xl font-bold'>{stats.pending}</div>
              </div>
            </div>

            <Button
              onClick={sendEmails}
              disabled={isLoading || stats.pending === 0}
              className='w-full'
            >
              {isLoading ? "Sending..." : "Send Voter Codes"}
            </Button>

            {error && (
              <Alert variant='destructive'>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert>
                <AlertDescription>{success}</AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
