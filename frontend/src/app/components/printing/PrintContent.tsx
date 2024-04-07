import PrintFoot from "./PrintFoot";
import PrintHead from "./PrintHead";
import styles from "./styles.module.css";
export default function PrintContent({ header = undefined, children, footer = undefined }) {
  return (
    <>
      <div className={styles.pageHeader}>
        {header ?? <PrintHead />}
        <br />
      </div>

      <div className={styles.pageFooter}>
        {footer ?? <PrintFoot />}
      </div>

      <table style={{ width: "100%" }}>
        <thead className={styles.thead}>
          <tr>
            <td>
              {/* <!--place holder for the fixed-position header--> */}
              <div className={styles.pageHeaderSpace}></div>
            </td>
          </tr>
        </thead>

        <tbody>
          <tr>
            <td>
              {/* <!--*** CONTENT GOES HERE ***--> */}
              <div className='page'>{children}</div>
            </td>
          </tr>
        </tbody>

        <tfoot className={styles.tfoot}>
          <tr>
            <td>
              {/* <!--place holder for the fixed-position footer--> */}
              <div className={styles.pageFooterSpace}></div>
            </td>
          </tr>
        </tfoot>
      </table>
    </>
  );
}
