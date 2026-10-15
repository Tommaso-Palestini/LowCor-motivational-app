import { findActivityByName } from "../../logic/activities";
import { formatDate } from "../../logic/dates";
import { IconCheck, IconPlus, IconSparkle } from "../Icons";

const KIND_LABEL = {
  impara: "Da imparare",
  fai: "Da fare",
  progetto: "Progetto",
};

// Una proposta risulta "aggiunta" se nel calendario c'è già quel blocco:
// così se annulli con Ctrl+Z il pulsante torna attivo da solo.
function isProposalAdded(proposal, data) {
  const activity = findActivityByName(data.activities, proposal.activityName);
  return (
    activity !== null &&
    data.blocks.some(
      (block) =>
        block.activityId === activity.id &&
        block.date === proposal.date &&
        block.start === proposal.start &&
        block.end === proposal.end
    )
  );
}

function Proposals({ proposals, data, actions }) {
  const pending = proposals.filter((proposal) => !isProposalAdded(proposal, data));

  return (
    <div className="proposals">
      <ul className="proposal-list">
        {proposals.map((proposal, index) => {
          const added = isProposalAdded(proposal, data);
          const isNew = findActivityByName(data.activities, proposal.activityName) === null;
          return (
            <li key={index} className={`proposal ${added ? "proposal--added" : ""}`}>
              <div className="proposal-when">
                <span className="proposal-day">{formatDate(proposal.date, { weekday: "short", day: "numeric" })}</span>
                <span className="proposal-time">
                  {proposal.start}–{proposal.end}
                </span>
              </div>
              <div className="proposal-body">
                <p className="proposal-name">
                  {proposal.activityName}
                  {isNew && !added && <span className="chip chip--quiet">nuova attività</span>}
                </p>
                {proposal.why && <p className="proposal-why">{proposal.why}</p>}
                {proposal.conflict && !added && (
                  <p className="proposal-warning">Si sovrappone a un blocco che hai già</p>
                )}
              </div>
              <button
                type="button"
                className={`button ${added ? "button--quiet" : "button--ghost"} proposal-add`}
                disabled={added}
                onClick={() => actions.addProposal(proposal)}
              >
                {added ? <IconCheck /> : <IconPlus />}
                {added ? "Aggiunto" : "Aggiungi"}
              </button>
            </li>
          );
        })}
      </ul>
      {pending.length > 1 && (
        <button type="button" className="button button--primary" onClick={() => actions.addProposals(pending)}>
          <IconPlus />
          Aggiungi tutti e {pending.length}
        </button>
      )}
    </div>
  );
}

function Ideas({ ideas, data, actions }) {
  return (
    <ul className="idea-list">
      {ideas.map((idea, index) => {
        const adopted = findActivityByName(data.activities, idea.title) !== null;
        return (
          <li key={index} className={`idea idea--${idea.kind}`}>
            <span className="chip chip--quiet">{KIND_LABEL[idea.kind] || "Idea"}</span>
            <p className="idea-title">{idea.title}</p>
            {idea.why && <p className="idea-why">{idea.why}</p>}
            <p className="idea-step">
              <span>Primo passo</span>
              {idea.firstStep}
            </p>
            <button
              type="button"
              className={`button ${adopted ? "button--quiet" : "button--ghost"}`}
              disabled={adopted}
              onClick={() => actions.adoptIdea(idea)}
            >
              {adopted ? <IconCheck /> : <IconSparkle />}
              {adopted ? "È tra le tue attività" : "Provala"}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function BrainstormMessage({ message, data, actions }) {
  if (message.role === "user") {
    return (
      <div className="bubble bubble--user">
        <p>{message.text}</p>
      </div>
    );
  }

  const classes = [
    "bubble",
    "bubble--assistant",
    message.error ? "bubble--error" : "",
    message.stopped ? "bubble--stopped" : "",
  ].join(" ");

  return (
    <div className={classes}>
      <p>{message.text}</p>
      {message.proposals && message.proposals.length > 0 && (
        <Proposals proposals={message.proposals} data={data} actions={actions} />
      )}
      {message.ideas && message.ideas.length > 0 && <Ideas ideas={message.ideas} data={data} actions={actions} />}
    </div>
  );
}

export default BrainstormMessage;
