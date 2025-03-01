import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useHistory } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import { Form, Input, message, Select } from 'antd';
import {
  StrayPageWithButton,
  MultiSelectAddressList,
  LoadingOverlay,
} from 'ui/component';
import type { ISelectAccountItem } from 'ui/component/MultiSelectAddressList';
import stats from '@/stats';
import {
  getUiType,
  useWalletOld as useWallet,
  useWalletRequest,
} from 'ui/utils';
import { HARDWARE_KEYRING_TYPES, HDPaths } from 'consts';
import { BIP44_PATH, LEDGER_LIVE_PATH } from '../ImportHardware/LedgerHdPath';
import Pagination from './components/Pagination';
import './style.less';
import { useMedia } from 'react-use';
import type { Account } from '@/background/service/preference';

const { Option } = Select;

const SelectAddress = ({ isPopup = false }: { isPopup?: boolean }) => {
  const history = useHistory();
  const { t } = useTranslation();
  const isWide = useMedia('(min-width: 401px)');
  const { state } = useLocation<{
    keyring: string;
    isMnemonics?: boolean;
    isWebHID?: boolean;
    path?: string;
    keyringId?: number | null;
    ledgerLive?: boolean;
  }>();

  if (!state) {
    if (getUiType().isTab) {
      if (history.length) {
        history.goBack();
      } else {
        window.close();
      }
    } else {
      history.replace('/dashboard');
    }
    return null;
  }

  const {
    keyring,
    isMnemonics,
    isWebHID,
    ledgerLive,
    path = LEDGER_LIVE_PATH,
  } = state;

  const [accounts, setAccounts] = useState<any[]>([]);
  const [importedAccounts, setImportedAccounts] = useState<any[]>([]);
  const [form] = Form.useForm<{
    selectedAddressIndexes: ISelectAccountItem[];
  }>();
  const wallet = useWallet();
  const keyringId = useRef<number | null | undefined>(state.keyringId);
  const [selectedAccounts, setSelectedAcounts] = useState<ISelectAccountItem[]>(
    []
  );
  const [end, setEnd] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [errorMsg, setErrorMsg] = useState('');
  const [spinning, setSpin] = useState(true);
  const isGrid = keyring === HARDWARE_KEYRING_TYPES.GridPlus.type;
  const isLedger = keyring === HARDWARE_KEYRING_TYPES.Ledger.type;

  const [getAccounts] = useWalletRequest(
    async (firstFlag, start?, end?): Promise<Account[]> => {
      setSpin(true);
      return firstFlag
        ? await wallet.requestKeyring(
            keyring,
            'getFirstPage',
            keyringId.current ?? null
          )
        : end && !isGrid && !ledgerLive
        ? await wallet.requestKeyring(
            keyring,
            'getAddresses',
            keyringId.current ?? null,
            start,
            end
          )
        : await wallet.requestKeyring(
            keyring,
            'getNextPage',
            keyringId.current ?? null
          );
    },
    {
      onSuccess(_accounts) {
        if (_accounts.length < 5) {
          throw new Error(
            t(
              'You need to make use your last account before you can add a new one'
            )
          );
        }
        setSpin(false);
        setAccounts(_accounts);
      },
      onError(err) {
        message.error('Please check the connection with your wallet');
        setSpin(false);
      },
    }
  );

  const init = async () => {
    if (keyringId.current === null || keyringId.current === undefined) {
      const stashKeyringId = await wallet.connectHardware({
        type: keyring,
        hdPath:
          path ||
          (keyring === HARDWARE_KEYRING_TYPES.Ledger.type
            ? LEDGER_LIVE_PATH
            : BIP44_PATH),
        isWebHID,
      });
      keyringId.current = stashKeyringId;
    }

    const _importedAccounts = await wallet.requestKeyring(
      keyring,
      'getAccounts',
      keyringId.current
    );
    setImportedAccounts(_importedAccounts);
    getAccounts(true);
  };

  useEffect(() => {
    init();
    if (!isMnemonics) {
      stats.report('connectHardware', {
        type: keyring,
      });
    }
    return () => {
      wallet.requestKeyring(keyring, 'cleanUp', keyringId.current ?? null);
    };
  }, []);

  const handleHDPathChange = async (v: string) => {
    await wallet.requestKeyring(
      keyring,
      'setHdPath',
      keyringId.current ?? null,
      v
    );
    getAccounts(true);
    setCurrentPage(1);
    setEnd(1);
  };

  const handlePageChange = async (page: number) => {
    const start = 5 * (page - 1);
    const end = 5 * (page - 1) + 5;
    await getAccounts(false, start, end);
    setCurrentPage(page);
  };

  const onSubmit = async ({
    selectedAddressIndexes,
  }: {
    selectedAddressIndexes: ISelectAccountItem[];
  }) => {
    setSpin(true);
    const selectedIndexes = selectedAddressIndexes.map((i) => i.index - 1);

    if (isMnemonics) {
      await wallet.requestKeyring(
        keyring,
        'activeAccounts',
        keyringId.current ?? null,
        selectedIndexes
      );
      await wallet.addKeyring(keyringId.current);
    } else {
      await wallet.unlockHardwareAccount(
        keyring,
        selectedIndexes,
        keyringId.current
      );
    }

    if (keyring === HARDWARE_KEYRING_TYPES.Ledger.type && isWebHID) {
      await wallet.requestKeyring(
        keyring,
        'cleanUp',
        keyringId.current ?? null
      );
    }
    setSpin(false);
    history.replace({
      pathname: isPopup ? '/popup/import/success' : '/import/success',
      state: {
        accounts: selectedAccounts.map((account) => ({
          ...account,
          brandName: keyring,
          type: keyring,
        })),
        hasDivider: !!isMnemonics,
        editing: true,
        showImportIcon: false,
        isMnemonics,
        importedAccount: true,
        importedLength: importedAccounts && importedAccounts?.length,
      },
    });
  };

  const startNumberConfirm: React.ComponentProps<
    typeof Input
  >['onPressEnter'] = (e) => {
    e.preventDefault();
    let page = 1;
    if (end % 5 === 0) {
      page = end / 5;
    } else {
      page = Math.floor(end / 5) + 1;
    }
    handlePageChange(page);
  };

  const toSpecificNumber = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    const currentNumber = parseInt(e.target.value);
    if (!currentNumber) {
      setEnd(0);
      return;
    } else {
      setErrorMsg(t(''));
      setEnd(Number(currentNumber));
    }
  };

  const handleSelectChange = (res: { address: string; index: number }[]) => {
    setSelectedAcounts(res);
  };

  return (
    <div className="select-address">
      <StrayPageWithButton
        custom={isPopup && isWide}
        className={clsx(isPopup && isWide && 'rabby-stray-page')}
        header={
          isPopup
            ? undefined
            : isMnemonics
            ? {
                secondTitle: t('Select Addresses'),
                subTitle: t('Select the addresses you want to import'),
              }
            : {
                title: t('Select the addresses to use in Rabby'),
                center: true,
              }
        }
        headerClassName="mb-16"
        onSubmit={onSubmit}
        nextDisabled={selectedAccounts.length === 0}
        hasBack
        hasDivider={isMnemonics}
        form={form}
        footerFixed={false}
        noPadding={isPopup}
        disableKeyDownEvent
        isScrollContainer={isPopup}
      >
        {isPopup && (
          <header className="create-new-header create-password-header h-[100px]">
            <div className="rabby-container">
              <p className="text-24 mb-4 text-white text-center font-bold">
                {t('Select Addresses')}
              </p>
              <p className="text-14 mb-0 mt-4 text-white opacity-80 text-center">
                {t('Select the addresses you want to import')}
              </p>
            </div>
          </header>
        )}
        {isLedger && (
          <div className="select-hdpath">
            {t('SelectHDPath')}
            <Select
              defaultValue={path}
              onChange={handleHDPathChange}
              dropdownMatchSelectWidth={180}
              dropdownClassName="select-hdpath-dropdown"
            >
              {HDPaths[keyring].map((path) => {
                return <Option value={path.value}>{path.name}</Option>;
              })}
            </Select>
          </div>
        )}
        <div
          className={clsx(
            'h-[40px] select-address-wrapper flex',
            isPopup ? 'w-[400px]' : 'w-[460px]',
            isGrid || ledgerLive ? 'justify-end' : 'items-center'
          )}
        >
          {!isGrid && !ledgerLive && (
            <div className={clsx('flex items-center')}>
              <p className="pt-12">{t('Start from address')}</p>{' '}
              <Input
                className="ml-10"
                size="small"
                width={48}
                height={24}
                maxLength={6}
                onChange={toSpecificNumber}
                onPressEnter={startNumberConfirm}
                spellCheck={false}
                value={end}
              />
              {errorMsg && <p className="error-message pt-12">{errorMsg}</p>}
            </div>
          )}

          <div className="place-self-center">
            {selectedAccounts.length} {t('addresses selected')}
          </div>
        </div>
        <div className={clsx(isPopup && 'rabby-container')}>
          <div
            className={clsx('overflow-y-auto flex justify-center', {
              'p-20': isPopup,
              'flex-1': isPopup,
            })}
          >
            <Form.Item className="mb-0 flex-1" name="selectedAddressIndexes">
              <MultiSelectAddressList
                accounts={accounts}
                importedAccounts={importedAccounts}
                type={keyring}
                onChange={handleSelectChange}
              />
            </Form.Item>
          </div>
        </div>
        <Pagination current={currentPage} onChange={handlePageChange} />
      </StrayPageWithButton>
      <LoadingOverlay hidden={!spinning} />
    </div>
  );
};

export default SelectAddress;
