import { describe, expect, it } from 'vitest';
import { parseKmlDocument } from './parseKmlDocument';

const gxKml = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2" xmlns:gx="http://www.google.com/kml/ext/2.2">
  <Placemark>
    <name>GX Track</name>
    <gx:Track>
      <when>2025-01-01T10:00:00Z</when>
      <when>2025-01-01T10:05:00Z</when>
      <gx:coord>1.0 42.0 1000</gx:coord>
      <gx:coord>1.0005 42.0005 1015</gx:coord>
      <ExtendedData>
        <SchemaData>
          <gx:SimpleArrayData name="heartrate">
            <gx:value>120</gx:value>
            <gx:value>125</gx:value>
          </gx:SimpleArrayData>
          <gx:SimpleArrayData name="cad">
            <gx:value>82</gx:value>
            <gx:value>84</gx:value>
          </gx:SimpleArrayData>
          <gx:SimpleArrayData name="watts">
            <gx:value>210</gx:value>
            <gx:value>220</gx:value>
          </gx:SimpleArrayData>
          <gx:SimpleArrayData name="temp">
            <gx:value>14</gx:value>
            <gx:value>15</gx:value>
          </gx:SimpleArrayData>
        </SchemaData>
      </ExtendedData>
    </gx:Track>
  </Placemark>
</kml>`;

const lineStringKml = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Placemark>
    <LineString>
      <coordinates>
        1.0,42.0,1000 1.0005,42.0005,1015
      </coordinates>
    </LineString>
  </Placemark>
</kml>`;

describe('parseKmlDocument', () => {
  it('parses gx:Track points including sensor arrays', () => {
    const parsed = parseKmlDocument(gxKml, 'sample.kml');

    expect(parsed.name).toBe('GX Track');
    expect(parsed.rawPoints).toHaveLength(2);
    expect(parsed.rawPoints[0]).toMatchObject({
      lat: 42,
      lon: 1,
      elevation: 1000,
      heartRate: 120,
      cadence: 82,
      power: 210,
      temperature: 14,
    });
    expect(parsed.rawPoints[1].time?.toISOString()).toBe('2025-01-01T10:05:00.000Z');
  });

  it('falls back to LineString coordinates and filename-derived names', () => {
    const parsed = parseKmlDocument(lineStringKml, 'fallback-name.kml');

    expect(parsed.name).toBe('fallback-name');
    expect(parsed.rawPoints).toHaveLength(2);
    expect(parsed.rawPoints[1]).toMatchObject({
      lat: 42.0005,
      lon: 1.0005,
      elevation: 1015,
      time: null,
      heartRate: null,
    });
  });

  it('throws clear errors for malformed or empty KML files', () => {
    expect(() => parseKmlDocument('<kml><parsererror /></kml>', 'bad.kml')).toThrow('Invalid KML file format');
    expect(() => parseKmlDocument('<?xml version="1.0"?><kml xmlns="http://www.opengis.net/kml/2.2"><Placemark /></kml>', 'empty.kml')).toThrow(
      'No coordinates found in KML file'
    );
  });
});
