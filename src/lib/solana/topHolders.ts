import axios from 'axios';
import { TopHolders } from '../../types/messageCard';

const data_service_url = process.env.PROXY_SERVER2_URL

export async function getTopHolders(token:string): Promise<TopHolders[] | null> {
  try {
    const response = await axios.get<any>(
      data_service_url + "token/holders?address="+token,
      {
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );
    const topHolders: TopHolders[] = response.data;
    return topHolders;
  } catch (error) {
    console.error('Error fetching Top Holders:', error);
    return null;
  }
}
