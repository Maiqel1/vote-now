"use client";

import React, { useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";

export default function SignUpPage() {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    phoneNumber: "",
    email: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/register-voter", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Registration failed");
      }

      setSuccess(true);
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
          <form onSubmit={handleSubmit} className='space-y-4'>
            <Input
              name='firstName'
              placeholder='First Name'
              value={formData.firstName}
              onChange={handleInputChange}
            />
            <Input
              name='lastName'
              placeholder='Last Name'
              value={formData.lastName}
              onChange={handleInputChange}
            />
            <Input
              name='phoneNumber'
              placeholder='Phone Number'
              value={formData.phoneNumber}
              onChange={handleInputChange}
            />
            <Input
              name='email'
              type='email'
              placeholder='Email'
              value={formData.email}
              onChange={handleInputChange}
              required
            />
            <Button type='submit' disabled={isLoading} className='w-full'>
              {isLoading ? "Registering..." : "Register"}
            </Button>
          </form>

          {error && (
            <Alert variant='destructive' className='mt-4'>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className='mt-4'>
              <AlertDescription>
                Registration successful! You will receive your voting code by
                email on the morning of the election.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
