import { Callout, H2, InlineLink, List, P, Strong } from "../Article";

export function UnlimitedVotersGuide() {
  return (
    <>
      <P>
        Most online voting tools email every voter a personal link. That works well for a committee or a small club, but email
        doesn&apos;t scale cheaply: send thousands of ballots and you hit sending limits, spam folders and bounced addresses. On
        VoteNow there&apos;s a second way to run an election, built for big electorates: voters sign in with Google, and no emails
        are sent at all. That&apos;s why it has no voter limit.
      </P>

      <H2>How Google sign-in voting works</H2>
      <P>
        You upload your voter list as usual, then share one voting link wherever your voters already are. Each voter opens the
        link, taps <Strong>Continue with Google</Strong> and signs in. If their Google email address is on your voter list, they
        go straight to the ballot. If it isn&apos;t, they can&apos;t vote.
      </P>
      <Callout title="The one rule to remember">
        Voters must sign in with the same email address that&apos;s on your voter list. If a student is listed as
        ada@school.edu but signs in with a personal Gmail account, they won&apos;t be let in. Collect the address each voter
        actually uses with Google.
      </Callout>
      <P>Everything else stays the same as an email election:</P>
      <List>
        <li>Each voter can vote once. A second attempt is refused.</li>
        <li>Ballots are stored with no link to the voter, so nobody can see how anyone voted.</li>
        <li>Every voter gets a receipt code to confirm their ballot was counted.</li>
        <li>Turnout is live on your dashboard, and you choose when results go public.</li>
      </List>

      <H2>Step 1: Choose Google sign-in</H2>
      <P>
        When you create the election, VoteNow asks <Strong>How will voters get in?</Strong> Pick{" "}
        <Strong>Google sign-in</Strong>. Changed your mind? You can switch in the election&apos;s settings any time before voting
        opens.
      </P>

      <H2>Step 2: Collect your voters&apos; Google emails</H2>
      <P>
        This is the step that matters most. Your list needs the exact address each voter signs in to Google with. A few ways to
        get it:
      </P>
      <List>
        <li>
          <Strong>Use the addresses you already trust.</Strong> If your school or organization uses Google Workspace, everyone
          already has a Google account at your domain, and the official list is enough.
        </li>
        <li>
          <Strong>Run a registration form</Strong> before the election, asking each voter for the Google or Gmail address they
          use, and check it against your register.
        </li>
        <li>
          <Strong>Ask departments or class reps</Strong> to collect addresses from their members.
        </li>
      </List>
      <P>
        Then paste the list or import the spreadsheet. VoteNow flags duplicates and invalid addresses, and imports large lists in
        batches, so tens of thousands of voters is fine. Gmail ignores dots in addresses, and so do we: if a voter is listed as
        ada.obi@gmail.com and signs in as adaobi@gmail.com, it still matches.
      </P>

      <H2>Step 3: Share one link</H2>
      <P>
        Instead of sending invitations, open the election&apos;s <Strong>Share</Strong> tab. Copy the voting link and a ready-made
        message for your voters, and send it straight to WhatsApp, Slack, email, Twitter or wherever your voters are. Post it on
        notice boards too. Because everyone uses the same link, you can share it as widely as you like: only people on your list can
        vote.
      </P>
      <Callout title="Tip">
        In your announcement, tell voters to sign in with the email they registered. It saves you most of the questions on
        voting day.
      </Callout>

      <H2>Step 4: Print slips for anyone without Google</H2>
      <P>
        Some voters won&apos;t have a Google account. Select them on the voters screen and print voting slips. Each slip has a
        personal code they can enter on the voting page instead of signing in with Google.
      </P>

      <H2>Step 5: Watch turnout and publish results</H2>
      <P>
        Turnout updates live while voting is open. There are no reminder emails in this mode, so if turnout is slow, share the
        link again. Votes are counted as they come in, so results are ready the moment voting closes, and you decide when to
        publish them.
      </P>

      <H2>When to use email invitations instead</H2>
      <P>
        For a small group where you only have work or school email addresses that aren&apos;t Google accounts, email
        invitations are simpler: every voter gets a personal one-click link and a backup code, with nothing to sign in to. For
        large electorates, Google sign-in is the way to go.
      </P>
      <P>
        Running a student union election? Our{" "}
        <InlineLink href="/blog/how-to-run-a-student-union-election-online">student union election guide</InlineLink> covers the
        rest, from building the ballot to publishing results.
      </P>
    </>
  );
}
