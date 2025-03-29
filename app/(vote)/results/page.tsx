"use client";

import React, { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";

type Position = "president" | "vicePresident" | "secretary";

interface Candidate {
  id: string;
  name: string;
  position: Position;
}

interface VoteResults {
  [key: string]: number;
}

const candidates: Candidate[] = [
  { id: "1", name: "Ayodele Damilola David", position: "president" },
  { id: "2", name: "Iklaki Christabel", position: "vicePresident" },
  { id: "3", name: "Eluma Victoria", position: "vicePresident" },
  { id: "4", name: "Ibekwe Stella Nnenna", position: "secretary" },
  { id: "5", name: "Obiefoka Joy", position: "secretary" },
  // { id: "6", name: "...", position: "secretary" },
];

export default function ResultsPage() {
  const [results, setResults] = useState<Record<Position, VoteResults>>({
    president: {},
    vicePresident: {},
    secretary: {},
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchResults() {
      try {
        const positions: Position[] = [
          "president",
          "vicePresident",
          "secretary",
        ];
        const newResults: Record<Position, VoteResults> = {
          president: {},
          vicePresident: {},
          secretary: {},
        };

        for (const position of positions) {
          const voteDoc = await getDoc(doc(db, "votes", position));
          if (voteDoc.exists()) {
            newResults[position] = voteDoc.data() as VoteResults;
          }
        }

        setResults(newResults);
      } catch (err) {
        setError("Failed to fetch results");
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchResults();
  }, []);

  const getVoteCount = (candidateId: string, position: Position) => {
    return results[position][candidateId] || 0;
  };

  const calculatePercentage = (candidateId: string, position: Position) => {
    const totalVotes = Object.values(results[position]).reduce(
      (sum, count) => sum + count,
      0
    );
    const candidateVotes = getVoteCount(candidateId, position);
    if (totalVotes === 0) return 0;
    return ((candidateVotes / totalVotes) * 100).toFixed(1);
  };

  if (isLoading) {
    return (
      <div className='container mx-auto max-w-2xl p-4'>
        <Card>
          <CardContent className='pt-6'>
            <div className='text-center'>Loading results...</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className='container mx-auto max-w-2xl p-4'>
        <Card>
          <CardContent className='pt-6'>
            <div className='text-center text-red-500'>{error}</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className='container mx-auto max-w-2xl p-4'>
      <h1 className='text-3xl font-bold text-center mb-6'>Election Results</h1>
      {(["president", "vicePresident", "secretary"] as Position[]).map(
        (position) => (
          <Card key={position} className='mb-6'>
            <CardHeader>
              <CardTitle className='capitalize'>
                {position.replace(/([A-Z])/g, " $1").trim()}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className='space-y-4'>
                {candidates
                  .filter((c) => c.position === position)
                  .map((candidate) => {
                    const voteCount = getVoteCount(candidate.id, position);
                    const percentage = calculatePercentage(
                      candidate.id,
                      position
                    );
                    return (
                      <div key={candidate.id} className='space-y-2'>
                        <div className='flex justify-between'>
                          <span>{candidate.name}</span>
                          <span>
                            {voteCount} votes ({percentage}%)
                          </span>
                        </div>
                        <div className='w-full bg-gray-200 rounded-full h-2.5'>
                          <div
                            className='bg-blue-600 h-2.5 rounded-full'
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </CardContent>
          </Card>
        )
      )}
    </div>
  );
}
