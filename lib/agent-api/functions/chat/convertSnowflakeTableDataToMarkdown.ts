/* eslint-disable @typescript-eslint/no-explicit-any */
import { addDays, format } from 'date-fns';

/**
 * Converts Snowflake JSON results into a Markdown table.
 * @param {object} responseJson - The Snowflake SQL ExecutionResponse.
 * @returns {string} A Markdown string representing the data.
 */
export function convertSnowflakeTableDataToMarkdown(tableData: any): string {
    // Extract column names
    const columns = tableData.resultSetMetaData.rowType.map((colDef: any) => colDef.name);

    // Prepare table header in Markdown
    // e.g. | COL1 | COL2 | ... |
    let markdown = `| ${columns.join(' | ')} |\n`;

    // Prepare the header separator row in Markdown
    // e.g. | --- | --- | ... |
    markdown += `| ${columns.map(() => '---').join(' | ')} |\n`;

    // Build table rows
    // tableData.data is an array of arrays, e.g. [ [val1, val2], [val3, val4], ... ]
    tableData.data.forEach((row: any) => {
        const rowValues = row.map((val: any, index: number) => {
            if (val == null) {
                return '';
            }
            // Check if the column name contains "date"
            if (columns[index].toLowerCase().includes('date')) {
                // Convert the value from days since 1970-01-01 to a formatted date
                const date = addDays(new Date(1970,0,1), Number(val));
                return format(date, 'yyyy-MM-dd');
            }
            return val;
        });
        markdown += `| ${rowValues.join(' | ')} |\n`;
    });

    return markdown;
}