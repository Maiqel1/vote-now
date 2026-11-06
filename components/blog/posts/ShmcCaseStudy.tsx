import { H2, InlineLink, List, P, Quote, Stats, Strong } from "../Article";

export function ShmcCaseStudy() {
  return (
    <>
      <P>
        Every year, the corps members serving at State House Medical Centre elect the committee that represents them. Since 2024
        they have done it on VoteNow, and their latest election ran from start to finish without a single message to our team.
      </P>

      <Stats
        items={[
          { value: "4", label: "elections on VoteNow since 2024" },
          { value: "86%", label: "turnout in both 2025 and 2026" },
          { value: "69 of 80", label: "corps members voted in October 2026" },
          { value: "2 hrs", label: "for half of all votes to come in" },
        ]}
      />

      <H2>Where VoteNow started</H2>
      <P>
        VoteNow was first built in 2024 for this election, while its founder was serving as a corps member at the centre. The
        corps members have used it for every committee election since.
      </P>

      <H2>The October 2026 election</H2>
      <P>
        On 30 October 2026, the corps members&apos; election committee ran a five-position election for 80 registered voters. They
        set everything up themselves:
      </P>
      <List>
        <li>
          <Strong>A test run first.</Strong> The day before, the committee ran a small practice election among themselves, so
          they knew exactly what voters would see.
        </li>
        <li>
          <Strong>Personal voting links.</Strong> They uploaded the voter list and sent every corps member a one-click voting link
          by email.
        </li>
        <li>
          <Strong>A full day to vote.</Strong> Voting stayed open from 8 am to 10 pm, so members could vote at any point in the
          day.
        </li>
        <li>
          <Strong>Reminders.</Strong> Members who hadn&apos;t voted yet got a reminder.
        </li>
        <li>
          <Strong>Results on their terms.</Strong> Results stayed private until the committee was ready to release them.
        </li>
      </List>

      <H2>The results</H2>
      <P>
        69 of the 80 registered corps members voted, a turnout of 86%. The first vote arrived five minutes after voting opened,
        and half of all votes were in within two hours. The previous year&apos;s election had exactly the same turnout, with 65 of
        76 members voting.
      </P>
      <P>
        Every ballot stayed secret. VoteNow stores ballots with no link to the voter, so the committee could see who had voted,
        but never how.
      </P>

      <H2>No help needed</H2>
      <P>
        The committee set up and ran the whole election by itself, without needing to contact us once. For us, that&apos;s the best
        possible outcome: an electoral committee that can run a trusted election entirely on its own.
      </P>

      <Quote cite="The SHMC corps members' election committee">
        &ldquo;Everything went smoothly. We had no issues whatsoever, and we&apos;ll be recommending VoteNow to our friends in other
        organizations.&rdquo;
      </Quote>

      <H2>What other committees can take from this</H2>
      <List>
        <li>Run a short test election with your committee before the real one.</li>
        <li>Give people a full day to vote rather than an hour.</li>
        <li>Send one round of reminders partway through.</li>
        <li>Decide before voting starts when the results will be published.</li>
      </List>
      <P>
        Planning your own? Our step-by-step guide covers the whole process:{" "}
        <InlineLink href="/blog/how-to-run-a-student-union-election-online">how to run a student union election online</InlineLink>.
      </P>
    </>
  );
}
