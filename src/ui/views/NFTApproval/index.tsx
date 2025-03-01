import {
  NFTApproval as INFTApproval,
  NFTApprovalContract,
  NFTApprovalResponse,
} from '@/background/service/openapi';
import { Account } from '@/background/service/preference';
import { message, Tabs, Tooltip } from 'antd';
import { CHAINS, CHAINS_ENUM } from 'consts';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useHistory, useLocation } from 'react-router-dom';
import IconInfo from 'ui/assets/infoicon.svg';
import { PageHeader } from 'ui/component';
import TagChainSelector from 'ui/component/ChainSelector/tag';
import { useWalletOld as useWallet } from 'ui/utils';
import NFTContractList from './components/NFTContractList';
import NFTList from './components/NFTList';
import PopupSearch from './components/PopupSearch';
import './style.less';
import { getAmountText } from './utils';
const { TabPane } = Tabs;

const NFTApproval = () => {
  const wallet = useWallet();
  const [chain, setChain] = useState<CHAINS_ENUM | null>(null);
  const [currentAccount, setCurrentAccount] = useState<Account | null>(null);
  const [loading, setLoading] = useState(false);
  const [isShowSearch, setIsShowSearch] = useState(false);
  const [data, setData] = useState<NFTApprovalResponse | null>(null);
  const { t } = useTranslation();
  const history = useHistory();
  const { state } = useLocation<{
    showChainsModal?: boolean;
  }>();
  const { showChainsModal = false } = state ?? {};

  const handleChainChanged = (val: CHAINS_ENUM) => {
    if (val === chain) {
      return;
    }
    wallet.setNFTApprovalChain(currentAccount?.address, val);
    setChain(val);
    setData(null);
  };

  const handleClickBack = () => {
    history.replace('/');
  };

  const init = async () => {
    const account = await wallet.syncGetCurrentAccount();
    const chain: CHAINS_ENUM = await wallet.getNFTApprovalChain(
      account.address
    );
    setCurrentAccount(account);
    setChain(chain);
  };

  const fetchData = async (chain) => {
    const account = await wallet.syncGetCurrentAccount();

    if (!account) {
      history.replace('/');
      return;
    }
    if (!chain) {
      return;
    }

    setLoading(true);
    try {
      const data = await wallet.openapi.userNFTAuthorizedList(
        account.address,
        CHAINS[chain]?.serverId
      );
      setData(data);
      setLoading(false);
    } catch (e) {
      console.error(e);
      setLoading(false);
      setData(null);
    }
  };
  const handleDecline = async ({
    contract,
    token,
  }: {
    contract?: NFTApprovalContract;
    token?: INFTApproval;
  }) => {
    try {
      if (contract) {
        const abi = contract?.is_erc721
          ? 'ERC721'
          : contract?.is_erc1155
          ? 'ERC1155'
          : '';
        await wallet.revokeNFTApprove({
          chainServerId: contract?.chain,
          contractId: contract?.contract_id,
          spender: contract?.spender.id,
          abi,
          tokenId: token?.inner_id,
          isApprovedForAll: true,
        });
      } else if (token) {
        const abi = token?.is_erc721
          ? 'ERC721'
          : token?.is_erc1155
          ? 'ERC1155'
          : '';
        await wallet.revokeNFTApprove({
          chainServerId: token?.chain,
          contractId: token?.contract_id,
          spender: token?.spender?.id,
          abi,
          tokenId: token?.inner_id,
          isApprovedForAll: false,
        });
      }
      window.close();
    } catch (e) {
      message.error(e.message);
      console.error(e);
    }
  };

  useEffect(() => {
    init();
  }, []);

  useEffect(() => {
    fetchData(chain);
  }, [chain]);

  if (!chain) {
    return null;
  }

  return (
    <div className="nft-approval">
      <PageHeader onBack={handleClickBack} forceShowBack fixed>
        {t('NFT Approval')}
      </PageHeader>
      <div>
        <TagChainSelector
          value={chain}
          onChange={handleChainChanged}
          showModal={showChainsModal}
        />
        <div className="card-risk-amount">
          <div className="card-risk-amount-title">
            <span>{t('Total risk exposure')}</span>
            <Tooltip
              align={{ offset: [55, 0] }}
              placement="top"
              overlayClassName="rectangle max-w-[250px] hide-arrow"
              title={t(
                'The total amount of assets affected by approval-related security issues'
              )}
            >
              <div>
                <img src={IconInfo} alt="" />
              </div>
            </Tooltip>
          </div>
          <div className="card-risk-amount-content">
            {getAmountText(data?.total || 0)}
          </div>
        </div>
        <Tabs>
          <TabPane tab={t('By Contract')} key="1">
            <NFTContractList
              data={data?.contracts}
              loading={loading}
              onSearch={() => {
                setIsShowSearch(true);
              }}
              onDecline={(item) => {
                handleDecline({ contract: item });
              }}
            ></NFTContractList>
          </TabPane>
          <TabPane tab={t('By NFT')} key="2">
            <NFTList
              data={data?.tokens}
              loading={loading}
              onSearch={() => {
                setIsShowSearch(true);
              }}
              onDecline={(item) => {
                handleDecline({ token: item });
              }}
            ></NFTList>
          </TabPane>
        </Tabs>
      </div>
      <PopupSearch
        visible={isShowSearch}
        data={data}
        onClose={() => {
          setIsShowSearch(false);
        }}
        onDecline={handleDecline}
      ></PopupSearch>
    </div>
  );
};

export default NFTApproval;
