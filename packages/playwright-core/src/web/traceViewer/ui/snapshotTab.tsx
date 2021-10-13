/**
 * Copyright (c) Microsoft Corporation.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { Size } from '../geometry';
import './snapshotTab.css';
import './tabbedPane.css';
import * as React from 'react';
import { useMeasure } from './helpers';
import { ActionTraceEvent } from '../../../server/trace/common/traceEvents';

export const SnapshotTab: React.FunctionComponent<{
  action: ActionTraceEvent | undefined,
  defaultSnapshotSize: Size,
}> = ({ action, defaultSnapshotSize }) => {
  const [measure, ref] = useMeasure<HTMLDivElement>();
  const [snapshotIndex, setSnapshotIndex] = React.useState(0);

  const snapshotMap = new Map<string, { title: string, snapshotName: string }>();
  for (const snapshot of action?.metadata.snapshots || [])
    snapshotMap.set(snapshot.title, snapshot);
  const actionSnapshot = snapshotMap.get('action') || snapshotMap.get('after');
  const snapshots = [actionSnapshot ? { ...actionSnapshot, title: 'action' } : undefined, snapshotMap.get('before'), snapshotMap.get('after')].filter(Boolean) as { title: string, snapshotName: string }[];

  let snapshotUrl = 'data:text/html,<body style="background: #ddd"></body>';
  let snapshotSizeUrl: string | undefined;
  let pointX: number | undefined;
  let pointY: number | undefined;
  if (action) {
    const snapshot = snapshots[snapshotIndex];
    if (snapshot && snapshot.snapshotName) {
      const traceUrl = new URL(window.location.href).searchParams.get('trace');
      snapshotUrl = new URL(`snapshot/${action.metadata.pageId}?trace=${traceUrl}&name=${snapshot.snapshotName}`, window.location.href).toString();
      snapshotSizeUrl = new URL(`snapshotSize/${action.metadata.pageId}?trace=${traceUrl}&name=${snapshot.snapshotName}`, window.location.href).toString();
      if (snapshot.snapshotName.includes('action')) {
        pointX = action.metadata.point?.x;
        pointY = action.metadata.point?.y;
      }
    }
  }

  React.useEffect(() => {
    if (snapshots.length >= 1 && snapshotIndex >= snapshots.length)
      setSnapshotIndex(snapshots.length - 1);
  }, [snapshotIndex, snapshots]);

  const iframeRef = React.useRef<HTMLIFrameElement>(null);
  const [snapshotSize, setSnapshotSize] = React.useState(defaultSnapshotSize);
  React.useEffect(() => {
    (async () => {
      if (snapshotSizeUrl) {
        const response = await fetch(snapshotSizeUrl);
        setSnapshotSize(await response.json());
      }
      if (!iframeRef.current)
        return;
      try {
        iframeRef.current.src = snapshotUrl + (pointX === undefined ? '' : `&pointX=${pointX}&pointY=${pointY}`);
      } catch (e) {
      }
    })();
  }, [iframeRef, snapshotUrl, snapshotSizeUrl, pointX, pointY]);

  const scale = Math.min(measure.width / snapshotSize.width, measure.height / snapshotSize.height, 1);
  const scaledSize = {
    width: snapshotSize.width * scale,
    height: snapshotSize.height * scale,
  };
  return <div
    className='snapshot-tab'
    tabIndex={0}
    onKeyDown={event => {
      if (event.key === 'ArrowRight')
        setSnapshotIndex(Math.min(snapshotIndex + 1, snapshots.length - 1));
      if (event.key === 'ArrowLeft')
        setSnapshotIndex(Math.max(snapshotIndex - 1, 0));
    }}
  ><div className='tab-strip'>
      {snapshots.map((snapshot, index) => {
        return <div className={'tab-element ' + (snapshotIndex === index ? ' selected' : '')}
          onClick={() => setSnapshotIndex(index)}
          key={snapshot.title}>
          <div className='tab-label'>{renderTitle(snapshot.title)}</div>
        </div>;
      })}
    </div>
    <div ref={ref} className='snapshot-wrapper'>
      <div className='snapshot-container' style={{
        width: snapshotSize.width + 'px',
        height: snapshotSize.height + 'px',
        transform: `translate(${-snapshotSize.width * (1 - scale) / 2 + (measure.width - scaledSize.width) / 2}px, ${-snapshotSize.height * (1 - scale) / 2  + (measure.height - scaledSize.height) / 2}px) scale(${scale})`,
      }}>
        <iframe ref={iframeRef} id='snapshot' name='snapshot'></iframe>
      </div>
    </div>
  </div>;
};

function renderTitle(snapshotTitle: string): string {
  if (snapshotTitle === 'before')
    return 'Before';
  if (snapshotTitle === 'after')
    return 'After';
  if (snapshotTitle === 'action')
    return 'Action';
  return snapshotTitle;
}
