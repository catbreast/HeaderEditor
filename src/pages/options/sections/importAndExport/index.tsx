import { getExportName } from '@/pages/options/utils';
import * as React from 'react';
import Api from '@/share/core/api';
import file from '@/share/core/file';
import { createExport } from '@/share/core/ruleUtils';
import { fetchUrl, t } from '@/share/core/utils';
import { TinyRule } from '@/share/core/var';
import Cloud from './cloud';
import ImportDrawer from './importDrawer';
import { Button, ButtonGroup, Card, Input, InputGroup, List, Space, Spin, Table, Toast } from '@douyinfe/semi-ui';
import { IconCloud, IconDownload, IconFolderOpen, IconSave, IconSearch } from '@douyinfe/semi-icons';
import { css } from '@emotion/css';
import { getLocal } from '@/share/core/storage';
import * as browser from 'webextension-polyfill';
import { openURL } from '@/pages/background/utils';

interface IEProps {
  visible: boolean;
}

interface IEState {
  downloadUrl: string;
  downloading: boolean;
  showCloud: boolean;
  downloadHistory: string[];
}

export default class ImportAndExport extends React.Component<IEProps, IEState> {
  private importRef: React.RefObject<ImportDrawer> = React.createRef();
  constructor(props: any) {
    super(props);

    this.handleImport = this.handleImport.bind(this);
    this.handleDownload = this.handleDownload.bind(this);
    this.handleCloudImport = this.handleCloudImport.bind(this);

    this.state = {
      downloadUrl: '',
      downloading: false,
      showCloud: false,
      downloadHistory: [],
    };
  }

  componentDidMount() {
    // Load download history
    getLocal().get('dl_history').then((r) => {
      if (Array.isArray(r.dl_history)) {
        this.setState({
          downloadHistory: r.dl_history,
        });
      }
    });
  }

  handleImport() {
    file.load('.json').then((content) => {
      try {
        this.importRef.current!.show(JSON.parse(content));
      } catch (e) {
        Toast.error(e.message);
      }
    });
  }

  async handleDownload() {
    this.setState({ downloading: true });
    try {
      const res = await fetchUrl({
        url: this.state.downloadUrl,
      });
      this.importRef.current!.show(JSON.parse(res));

      if (!this.state.downloadHistory.includes(this.state.downloadUrl)) {
        this.setState((prevState) => {
          const newHistory = [this.state.downloadUrl, ...prevState.downloadHistory];
          getLocal().set({
            dl_history: newHistory,
          });
          return {
            downloadHistory: newHistory,
          };
        });
      }
    } catch (e) {
      Toast.error(e.message);
    }
    this.setState({ downloading: false });
  }

  handleCloudImport(res: { [key: string]: TinyRule[] }) {
    try {
      this.importRef.current!.show(res);
    } catch (e) {
      Toast.error(e.message);
    }
  }

  async handleExport() {
    const result = await Api.getAllRules();
    file.save(JSON.stringify(createExport(result), null, '\t'), getExportName());
  }

  handleOpenThird() {
    const lang = browser.i18n.getUILanguage();
    if (['zh-CN', 'zh-TW'].includes(lang)) {
      openURL({
        url: `https://he.firefoxcn.net/${lang}/third-party-rules.html`,
      });
    } else {
      openURL({
        url: 'https://he.firefoxcn.net/en/third-party-rules.html',
      });
    }
  }

  render() {
    return (
      <section className={`section-ie ${this.props.visible ? 'visible' : 'in-visible'}`}>
        <Card title={t('export_and_import')}>
          <Space>
            <Button onClick={this.handleExport} icon={<IconSave />}>
              {t('export')}
            </Button>
            <Button onClick={this.handleImport} icon={<IconFolderOpen />}>
              {t('import')}
            </Button>
            <Button onClick={() => this.setState({ showCloud: true })} icon={<IconCloud />}>
              {t('cloud_backup')}
            </Button>
          </Space>
        </Card>
        <Card title={t('download_rule')}>
          <Space style={{ width: '100%' }}>
            <Input
              value={this.state.downloadUrl}
              style={{ width: '100%' }}
              showClear
              onChange={(downloadUrl) => this.setState({ downloadUrl })}
            />
            <Button className="btn-icon" onClick={this.handleDownload} icon={<IconDownload />} loading={this.state.downloading}>
              {t('download')}
            </Button>
            <Button className="btn-icon" icon={<IconSearch />} onClick={this.handleOpenThird}>
              {t('third_party_rules')}
            </Button>
          </Space>
          <Table
            showHeader={false}
            style={{ marginTop: '8px' }}
            dataSource={this.state.downloadHistory.map((x) => ({ url: x }))}
            size="small"
            columns={[
              {
                dataIndex: 'url',
              },
              {
                dataIndex: '',
                render: (_, record) => (
                  <Space>
                    <Button
                      size="small"
                      onClick={() => {
                        this.setState({
                          downloadUrl: record.url,
                        }, () => this.handleDownload());
                      }}
                    >
                      {t('download')}
                    </Button>
                    <Button
                      size="small"
                      onClick={() => {
                        this.setState({
                          downloadUrl: record.url,
                        });
                      }}
                    >
                      {t('edit')}
                    </Button>
                    <Button
                      size="small"
                      onClick={() => {
                        this.setState((prevState) => {
                          const newHistory = [...prevState.downloadHistory];
                          const index = newHistory.indexOf(record.url);
                          if (index === -1) {
                            return null;
                          }
                          newHistory.splice(index, 1);
                          getLocal().set({
                            dl_history: newHistory,
                          });
                          return {
                            downloadHistory: newHistory,
                          };
                        });
                      }}
                    >
                      {t('delete')}
                    </Button>
                  </Space>
                ),
              },
            ]}
            pagination={false}
          />
        </Card>
        <ImportDrawer ref={this.importRef} />
        <Cloud
          visible={this.state.showCloud}
          onClose={() => this.setState({ showCloud: false })}
          onImport={this.handleCloudImport}
        />
      </section>
    );
  }
}
