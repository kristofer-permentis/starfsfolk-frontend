// ✅ SentFilesTable.tsx — uses the full-featured FilesTable with correct API path

import FilesTable from './FilesTable';

export default function SentFilesTable() {
  return (
    <FilesTable apiPath="/signet/transfer/getSent" emptyMessage="Engar sendar skrár"/>
  );
}
