export default function PrintContent({ header = null, children, footer = null }) {
  return (
    <table style={{ width: "100%", height: "100vh" }}>
      <thead>{header}</thead>
      <tbody>{children}</tbody>
      <tfoot>{footer}</tfoot>
    </table>
  );
}
