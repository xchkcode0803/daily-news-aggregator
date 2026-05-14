export function isValidReportViewToken(token: string | undefined, expectedToken = process.env.REPORT_VIEW_TOKEN) {
  return Boolean(expectedToken && token === expectedToken);
}
