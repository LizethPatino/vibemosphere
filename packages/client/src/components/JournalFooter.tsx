type JournalFooterProps = {
  onGoToJournal: () => void;
};

export function JournalFooter({ onGoToJournal }: JournalFooterProps) {
  return (
    <footer className="journal-footer">
      <span className="journal-footer__line" />
      <button type="button" className="journal-footer__link" onClick={onGoToJournal}>
        ✦ vibe journal ✦
      </button>
      <span className="journal-footer__line" />
    </footer>
  );
}
