"use client";

import React, { useState, useEffect } from "react";
import {
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  doc,
  deleteDoc
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function AdminPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [stats, setStats] = useState({ total: 0, pending: 0 });

  useEffect(() => {
    fetchStats();
  }, []);

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

      if (response.status === 207) {
        setSuccess(
          `Partially successful: Sent ${data.sentCount} emails. ${data.errorCount} failed.`
        );
        setError(`Errors: ${data.errors.join("; ")}`);
      } else if (response.ok) {
        setSuccess(`Successfully sent ${data.sentCount} emails`);
      } else {
        throw new Error(data.error || "Failed to send emails");
      }

      await fetchStats(); // Refresh stats
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const clearVoters = async () => {
  if (!confirm("Are you sure you want to delete ALL voters? This cannot be undone.")) return;

  setIsLoading(true);
  setError("");
  setSuccess("");

  try {
    const votersRef = collection(db, "voters");
    const snapshot = await getDocs(votersRef);
    
    const deletePromises = snapshot.docs.map((doc) => 
      deleteDoc(doc.ref)
    );
    
    await Promise.all(deletePromises);
    setSuccess(`Successfully deleted ${snapshot.size} voters`);
    await fetchStats(); // Refresh stats
  } catch (err) {
    setError(err instanceof Error ? err.message : "Failed to delete voters");
  } finally {
    setIsLoading(false);
  }
};

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
              // disabled
              className='w-full'
            >
              {isLoading ? "Sending..." : "Send Voter Codes"}
            </Button>

            {/* <Button
            onClick={clearVoters}
            disabled={isLoading || stats.total === 0}
            variant="destructive"
            className="w-full"
          >
            {isLoading ? "Clearing..." : "Clear All Voters"}
          </Button> */}

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
