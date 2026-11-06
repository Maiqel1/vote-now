import { Callout, H2, InlineLink, List, P, Strong } from "../Article";

export function StudentUnionGuide() {
  return (
    <>
      <P>
        Paper ballots mean queues, a room full of ballot boxes and a long night of counting. Running your student union election
        online lets every student vote from their phone, and gives you a count you can trust the moment voting closes. Here&apos;s
        how to do it, step by step.
      </P>

      <H2>Before you start</H2>
      <P>Agree on a few things with your electoral committee first:</P>
      <List>
        <li>
          <Strong>Who runs the election:</Strong> an electoral committee whose members aren&apos;t standing for any position.
        </li>
        <li>
          <Strong>Who can vote:</Strong> usually every registered student, sometimes only one faculty or department.
        </li>
        <li>
          <Strong>What&apos;s on the ballot:</Strong> the positions, and the candidates once nominations close.
        </li>
        <li>
          <Strong>When voting opens and closes:</Strong> a full day works well, so students can vote between lectures.
        </li>
        <li>
          <Strong>When results come out:</Strong> live as votes come in, as soon as voting closes, or after the committee has
          reviewed them.
        </li>
      </List>

      <H2>Step 1: Build the ballot</H2>
      <P>
        Add each position, such as President or General Secretary, and then its candidates. On VoteNow you can add a photo and a
        short manifesto for each candidate, so students can read up before they vote. Each position can be:
      </P>
      <List>
        <li>
          <Strong>Single choice,</Strong> for most positions.
        </li>
        <li>
          <Strong>Pick several,</Strong> when a position has more than one seat.
        </li>
        <li>
          <Strong>Yes or No,</Strong> for an unopposed candidate, so they still need the voters&apos; approval.
        </li>
      </List>
      <P>
        You can also let students abstain on a position if your constitution allows it. Once voting starts, the ballot is locked,
        so nobody can change positions or candidates mid-election.
      </P>

      <H2>Step 2: Prepare the voter list</H2>
      <P>
        Get a list of eligible students and their email addresses from the registry or your departments. Paste it in or import
        the spreadsheet, and VoteNow flags duplicates and likely typos before anything is sent. For students without an email
        address, you can print voting slips with a personal code instead.
      </P>
      <Callout title="Tip">
        Use the email addresses students actually check, and tell them in advance to look out for the voting email, including in
        their spam folder.
      </Callout>

      <H2>Step 3: Send the ballots</H2>
      <P>
        When your ballot and voter list are ready, send the invitations. Each student gets a personal one-click voting link and a
        backup code. A link only works once: the moment a student votes, their ballot is recorded and they&apos;re marked as voted
        in a single step, so a second attempt is refused. If a student loses the email, they can request their link again from
        the election page.
      </P>
      <P>
        For a large union, you can skip email entirely. Choose Google sign-in when you create the election, share one link, and
        each student signs in with the Google account whose email is on your voter list. There&apos;s no voter limit in this
        mode. <InlineLink href="/blog/how-to-run-an-election-with-unlimited-voters">Here&apos;s how it works</InlineLink>.
      </P>

      <H2>Step 4: Watch turnout and send reminders</H2>
      <P>
        Your dashboard shows turnout live, so the committee always knows how many students have voted. Partway through, send a
        reminder to everyone who hasn&apos;t voted yet. If something unexpected happens, you can pause voting or extend the closing
        time, and every action is written to a permanent activity log.
      </P>

      <H2>Step 5: Publish the results</H2>
      <P>
        Votes are counted as they come in, so results are ready the moment voting closes. Publish them when you&apos;re ready. After
        voting, every student gets a receipt code they can use to confirm their ballot was counted, without revealing how they
        voted. When it&apos;s all over, you can delete voter details and keep only the totals.
      </P>

      <H2>Keeping the vote secret</H2>
      <P>
        The most important promise of any election is the secret ballot. On VoteNow, ballots are stored with no link to the
        voter. The committee can see who has voted, so they can send reminders, but never how anyone voted.
      </P>

      <H2>Tips from committees who&apos;ve done it</H2>
      <List>
        <li>Run a short test election with your committee first, so everyone knows what voters will see.</li>
        <li>Announce the voting day in advance, on every channel students use.</li>
        <li>Keep voting open for a full day rather than an hour.</li>
        <li>Agree before voting starts when, and how, the results will be published.</li>
      </List>
      <P>
        The corps members at State House Medical Centre followed this playbook and got 86% turnout.{" "}
        <InlineLink href="/blog/state-house-medical-centre-corps-members">Read how they did it</InlineLink>.
      </P>
    </>
  );
}
