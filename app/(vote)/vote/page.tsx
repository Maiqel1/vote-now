"use client";

import React, { useState } from "react";
import { doc, getDoc, updateDoc, increment, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

type Position = "president" | "vicePresident" | "secretary";

interface Candidate {
  id: string;
  name: string;
  position: "president" | "vicePresident" | "secretary";
}

interface Votes {
  president: string;
  vicePresident: string;
  secretary: string;
}

const candidates: Candidate[] = [
  { id: "1", name: "Comrade Joshua Osasenaga Aigbiremwen", position: "president" },
  { id: "2", name: "Kayode Olanrewaju Jacob", position: "president" },
  { id: "3", name: "Nwaoha Loveth", position: "vicePresident" },
  { id: "4", name: "Akinfemisoye Melody Oluwafayokemi", position: "secretary" },
  // { id: "5", name: "Obiefoka Joy", position: "secretary" },
  // { id: "6", name: "...", position: "secretary" },
];

// export default function VotingPage() {
//   const [email, setEmail] = useState("");
//   const [code, setCode] = useState("");
//   const [isVerified, setIsVerified] = useState(false);
//   const [isLoading, setIsLoading] = useState(false);
//   const [error, setError] = useState("");
//   const [votes, setVotes] = useState({
//     president: "",
//     vicePresident: "",
//     secretary: "",
//   });
//   const [userName, setUserName] = useState("");

//   const handleVoteChange = (position: Position, value: string) => {
//     setVotes((prev) => ({
//       ...prev,
//       [position]: value,
//     }));
//   };

//   const verifyVoter = async () => {
//     setIsLoading(true);
//     setError("");

//     try {
//       const voterDoc = await getDoc(doc(db, "voters", email));

//       if (!voterDoc.exists()) {
//         setError("Voter not found");
//         return;
//       }

//       const voterData = voterDoc.data();

//       if (voterData.hasVoted) {
//         setError("You have already voted");
//         return;
//       }

//       if (voterData.code !== code) {
//         setError("Invalid code");
//         return;
//       }

//       const fullName = `${voterData.firstName} ${voterData.lastName}`;
//       setUserName(fullName);

//       setIsVerified(true);
//     } catch (err) {
//       setError("Verification failed");
//       console.error(err);
//     } finally {
//       setIsLoading(false);
//     }
//   };

// const submitVote = async () => {
//   const isConfirmed = window.confirm(
//     "Are you sure you want to submit your vote?"
//   );
//   if (!isConfirmed) {
//     return;
//   }

//   if (!votes.president || !votes.vicePresident || !votes.secretary) {
//     setError("Please vote for all positions");
//     return;
//   }

//   setIsLoading(true);
//   setError("");

//   try {
//     const voterRef = doc(db, "voters", email);

//     await updateDoc(voterRef, {
//       hasVoted: true,
//       votedAt: new Date().toISOString(),
//       votes: votes,
//     });

//     for (const [position, candidateId] of Object.entries(votes)) {
//       const voteRef = doc(db, "votes", position);
//       const voteDoc = await getDoc(voteRef);

//       if (voteDoc.exists()) {
//         await updateDoc(voteRef, {
//           [`${candidateId}`]: increment(1),
//         });
//       } else {
//         await setDoc(voteRef, {
//           [`${candidateId}`]: 1,
//         });
//       }
//     }

//     setIsVerified(false);
//     setEmail("");
//     setCode("");
//     setVotes({ president: "", vicePresident: "", secretary: "" });
//     alert("Thank you for voting!");
//   } catch (err) {
//     setError("Failed to submit vote");
//     console.error(err);
//   } finally {
//     setIsLoading(false);
//   }
// };

//   if (!isVerified) {
//     return (
//       <div className='container mx-auto max-w-md p-4'>
//         <Card>
//           <CardHeader>
//             <CardTitle>Verify to Vote</CardTitle>
//           </CardHeader>
//           <CardContent>
//             <div className='space-y-4'>
//               <Input
//                 type='email'
//                 placeholder='Email'
//                 value={email}
//                 onChange={(e) => setEmail(e.target.value)}
//               />
//               <Input
//                 type='text'
//                 placeholder='Voting Code'
//                 value={code}
//                 onChange={(e) => setCode(e.target.value)}
//               />
//               <Button
//                 onClick={verifyVoter}
//                 disabled={isLoading}
//                 className='w-full'
//               >
//                 {isLoading ? "Verifying..." : "Verify"}
//               </Button>
//               {error && (
//                 <Alert variant='destructive'>
//                   <AlertDescription>{error}</AlertDescription>
//                 </Alert>
//               )}
//             </div>
//           </CardContent>
//         </Card>
//       </div>
//     );
//   }

//   return (
//     <div className='container mx-auto max-w-md p-4'>
//       <Card>
//         <CardHeader>
//           <CardTitle className='my-5'>Welcome, {userName}</CardTitle>
//           <CardTitle>Cast Your Vote</CardTitle>
//         </CardHeader>
//         <CardContent>
//           <div className='space-y-6'>
//             {(["president", "vicePresident", "secretary"] as Position[]).map(
//               (position) => (
//                 <div key={position} className='space-y-2'>
//                   <h3 className='text-lg font-medium capitalize'>
//                     {position.replace(/([A-Z])/g, " $1").trim()}
//                   </h3>
//                   <RadioGroup
//                     value={votes[position]}
//                     onValueChange={(value) => handleVoteChange(position, value)}
//                   >
//                     {candidates
//                       .filter((c) => c.position === position)
//                       .map((candidate) => (
//                         <div
//                           key={candidate.id}
//                           className='flex items-center space-x-2'
//                         >
//                           <RadioGroupItem
//                             value={candidate.id}
//                             id={candidate.id}
//                           />
//                           <Label htmlFor={candidate.id}>{candidate.name}</Label>
//                         </div>
//                       ))}
//                   </RadioGroup>
//                 </div>
//               )
//             )}
//             <Button
//               onClick={submitVote}
//               disabled={isLoading}
//               className='w-full'
//             >
//               {isLoading ? "Submitting..." : "Submit Vote"}
//             </Button>
//             {error && (
//               <Alert variant='destructive'>
//                 <AlertDescription>{error}</AlertDescription>
//               </Alert>
//             )}
//           </div>
//         </CardContent>
//       </Card>
//     </div>
//   );
// }


export default function VotingPage() {
  return (
    <div className='container mx-auto max-w-md p-4'>
      <Card className='my-10'>
        <CardContent className='p-5'>
          <p className='text-center'>
            {" "}
            Voting is now over, results will be announced in due time. Thank you
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

