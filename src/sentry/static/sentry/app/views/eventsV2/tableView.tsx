import React from 'react';
import {Location} from 'history';
import {omit} from 'lodash';
import {browserHistory} from 'react-router';
import styled from 'react-emotion';

import space from 'app/styles/space';
import withApi from 'app/utils/withApi';
import {Client} from 'app/api';
import {Organization} from 'app/types';
import InlineSvg from 'app/components/inlineSvg';
import Pagination from 'app/components/pagination';
import Panel from 'app/components/panels/panel';
import {PanelBody} from 'app/components/panels';
import LoadingContainer from 'app/components/loading/loadingContainer';
import EmptyStateWarning from 'app/components/emptyStateWarning';
import {t} from 'app/locale';

import {DEFAULT_EVENT_VIEW_V1} from './data';
import {MetaType, getFieldRenderer} from './utils';
import EventView from './eventView';
import SortLink from './sortLink';

type TableViewProps = {
  organization: Organization;
  eventView: EventView;
  isLoading: boolean;
  dataPayload: DataPayload | null | undefined;
  location: Location;
};
type TableViewState = {
  hasQueryBuilderEnabled: boolean;
};

class TableView extends React.Component<TableViewProps, TableViewState> {
  state = {
    hasQueryBuilderEnabled: false,
  };

  static getDerivedStateFromProps(props): TableViewState {
    const {organization} = props;
    return {
      hasQueryBuilderEnabled:
        organization.features.indexOf('discover-v2-query-builder') > -1,
    };
  }

  renderLoading = () => {
    return (
      <Panel>
        <PanelBody style={{minHeight: '240px'}}>
          <LoadingContainer isLoading={true} />
        </PanelBody>
      </Panel>
    );
  };

  renderHeader = () => {
    const {eventView, location, dataPayload} = this.props;
    const {hasQueryBuilderEnabled} = this.state;

    if (eventView.fields.length <= 0) {
      return null;
    }

    const defaultSort = eventView.getDefaultSort() || eventView.fields[0].field;

    if (hasQueryBuilderEnabled) {
      eventView.fields.push({
        title: <PanelHeaderEditColumn/>,
        field: 'Edit Columns',
      });
    }

    return eventView.fields.map((field, index) => {
      if (!dataPayload) {
        return <PanelHeaderCell key={index}>{field.title}</PanelHeaderCell>;
      }

      const {meta} = dataPayload;
      const sortKey = eventView.getSortKey(field.field, meta);

      if (sortKey === null) {
        return <PanelHeaderCell key={index}>{field.title}</PanelHeaderCell>;
      }

      return (
        <PanelHeaderCell key={index}>
          <SortLink
            defaultSort={defaultSort}
            sortKey={sortKey}
            title={field.title}
            location={location}
          />
        </PanelHeaderCell>
      );
    });
  };

  renderContent = (): React.ReactNode => {
    const {dataPayload, eventView, organization, location} = this.props;

    if (!(dataPayload && dataPayload.data && dataPayload.data.length > 0)) {
      return (
        <PanelGridInfo numOfCols={eventView.numOfColumns()}>
          <EmptyStateWarning>
            <p>{t('No results found')}</p>
          </EmptyStateWarning>
        </PanelGridInfo>
      );
    }

    const {meta} = dataPayload;
    const fields = eventView.getFieldNames();

    // TODO: deal with this
    // if (fields.length <= 0) {
    //   return (
    //     <PanelGridInfo numOfCols={1}>
    //       <EmptyStateWarning>
    //         <p>{t('No field column selected')}</p>
    //       </EmptyStateWarning>
    //     </PanelGridInfo>
    //   );
    // }

    const lastRowIndex = dataPayload.data.length - 1;

    // TODO add links to the first column even if it isn't one of our
    // preferred link columns (title, transaction, latest_event)
    const firstCellIndex = 0;
    const lastCellIndex = fields.length - 1;

    return dataPayload.data.map((row, rowIndex) => {
      return (
        <React.Fragment key={rowIndex}>
          {fields.map((field, columnIndex) => {
            const key = `${field}.${columnIndex}`;

            const fieldRenderer = getFieldRenderer(field, meta);
            return (
              <PanelItemCell
                hideBottomBorder={rowIndex === lastRowIndex}
                style={{
                  paddingLeft: columnIndex === firstCellIndex ? space(1) : void 0,
                  paddingRight: columnIndex === lastCellIndex ? space(1) : void 0,
                }}
                key={key}
              >
                {fieldRenderer(row, {organization, location})}
              </PanelItemCell>
            );
          })}
        </React.Fragment>
      );
    });
  };

  renderTable = () => {
    return (
      <React.Fragment>
        {this.renderHeader()}
        {this.renderContent()}
      </React.Fragment>
    );
  };

  render() {
    const {isLoading, eventView} = this.props;
    const {hasQueryBuilderEnabled} = this.state;

    if (isLoading) {
      return this.renderLoading();
    }

    console.log('organization', this.props.organization);
    console.log(this.props.eventView && this.props.eventView.fields);
    console.log(this.props.eventView && this.props.eventView.numOfColumns());
    console.log(this.props.dataPayload && this.props.dataPayload.data);

    // Check if we are going to show the QueryBuilder
    const numOfColumns = hasQueryBuilderEnabled
      ? eventView.numOfColumns()
      : eventView.numOfColumns() - 1;

    return <PanelGrid numOfCols={numOfColumns}>{this.renderTable()}</PanelGrid>;
  }
}

const PanelGridInfo = styled.div<PanelGridInfoProps>`
  grid-column: ${(props: PanelGridInfoProps) => `1 / span ${props.numOfCols}`};
`;

const PanelItemCell = styled('div')<{hideBottomBorder: boolean}>`
  border-bottom: ${p =>
    p.hideBottomBorder ? 'none' : `1px solid ${p.theme.borderLight}`};

  font-size: ${p => p.theme.fontSizeMedium};

  padding-top: ${space(1)};
  padding-bottom: ${space(1)};

  /*
    By default, a grid item cannot be smaller than the size of its content.
    We override this by setting it to be 0.
  */
  min-width: 0;
`;
